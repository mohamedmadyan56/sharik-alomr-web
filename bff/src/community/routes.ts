import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { asyncHandler, ok } from '../http/envelope';
import { ApiError } from '../http/errors';
import { validate } from '../http/validate';
import { requireAuth } from '../auth/session';
import { persistentRateLimit } from '../security/rateLimit';

export const communityRouter = Router();

communityRouter.use(requireAuth);

const writeLimiter = persistentRateLimit({
  name: 'community:write',
  limit: 60,
  windowSeconds: 60 * 60,
  key: (req) => req.auth?.userId ?? req.ip,
  message: 'مشاركات كثيرة — حاول بعد قليل',
});

const authorSelect = {
  id: true,
  firstName: true,
  lastName: true,
  isVerifiedBadge: true,
  verification: true,
  photos: {
    where: { status: 'active' as const, category: 'public' as const },
    select: { url: true, isPrimary: true },
    orderBy: [{ isPrimary: 'desc' as const }, { orderIndex: 'asc' as const }],
    take: 1,
  },
} satisfies import('@prisma/client').Prisma.UserSelect;

function authorView(author: {
  id: string;
  firstName: string;
  lastName: string | null;
  isVerifiedBadge: boolean;
  verification: string;
  photos: Array<{ url: string }>;
}) {
  return {
    id: author.id,
    name: [author.firstName, author.lastName].filter(Boolean).join(' '),
    photo: author.photos[0]?.url ?? null,
    verified: author.isVerifiedBadge || author.verification === 'verified',
  };
}

communityRouter.get(
  '/topics',
  asyncHandler(async (req, res) => {
    const [topics, follows] = await Promise.all([
      prisma.communityTopic.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { nameAr: 'asc' }],
        include: { _count: { select: { posts: true, follows: true } } },
      }),
      prisma.topicFollow.findMany({ where: { userId: req.auth!.userId }, select: { topicId: true } }),
    ]);
    const followed = new Set(follows.map((row) => row.topicId));
    return ok(res, {
      topics: topics.map((topic) => ({
        id: topic.id,
        key: topic.key,
        nameAr: topic.nameAr,
        icon: topic.icon,
        posts: topic._count.posts,
        followers: topic._count.follows,
        followed: followed.has(topic.id),
      })),
    });
  }),
);

communityRouter.get(
  '/posts',
  asyncHandler(async (req, res) => {
    const query = validate(
      z.object({
        topic: z.string().optional(),
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(30).default(10),
      }),
      req.query,
    );

    const where: import('@prisma/client').Prisma.PostWhereInput = {
      status: 'published',
      ...(query.topic ? { topic: { is: { key: query.topic } } } : {}),
    };

    const [rows, total, reactions] = await Promise.all([
      prisma.post.findMany({
        where,
        orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }, { createdAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          author: { select: authorSelect },
          topic: true,
          media: { orderBy: { orderIndex: 'asc' } },
          _count: { select: { comments: true } },
        },
      }),
      prisma.post.count({ where }),
      prisma.postReaction.findMany({
        where: {
          userId: req.auth!.userId,
          postId: { in: [] as string[] },
        },
        select: { postId: true, kind: true },
      }),
    ]);

    const postIds = rows.map((row) => row.id);
    const myReactions = postIds.length
      ? await prisma.postReaction.findMany({
          where: { userId: req.auth!.userId, postId: { in: postIds } },
          select: { postId: true, kind: true },
        })
      : [];
    const reactionMap = new Map(myReactions.map((row) => [`${row.postId}:${row.kind}`, true]));

    return ok(res, {
      results: rows.map((post) => ({
        id: post.id,
        body: post.body,
        topic: post.topic,
        author: authorView(post.author),
        media: post.media,
        likeCount: post.likeCount,
        commentCount: post.commentCount,
        bookmarkCount: post.bookmarkCount,
        liked: reactionMap.has(`${post.id}:like`),
        bookmarked: reactionMap.has(`${post.id}:bookmark`),
        comments: post._count.comments,
        isPinned: post.isPinned,
        createdAt: post.createdAt.toISOString(),
        publishedAt: post.publishedAt?.toISOString() ?? null,
      })),
      total,
      page: query.page,
      pages: Math.max(1, Math.ceil(total / query.limit)),
    });
  }),
);

communityRouter.get(
  '/posts/:id',
  asyncHandler(async (req, res) => {
    const id = z.string().min(1).parse(req.params.id);
    const post = await prisma.post.findFirst({
      where: { id, status: 'published' },
      include: {
        author: { select: authorSelect },
        topic: true,
        media: { orderBy: { orderIndex: 'asc' } },
        comments: {
          where: { status: 'published' },
          orderBy: { createdAt: 'asc' },
          take: 100,
          include: { author: { select: authorSelect } },
        },
      },
    });
    if (!post) throw ApiError.notFound('المنشور غير موجود');

    const reactions = await prisma.postReaction.findMany({
      where: { userId: req.auth!.userId, postId: id },
      select: { kind: true },
    });
    const kinds = new Set(reactions.map((row) => row.kind));

    return ok(res, {
      post: {
        id: post.id,
        body: post.body,
        topic: post.topic,
        author: authorView(post.author),
        media: post.media,
        likeCount: post.likeCount,
        commentCount: post.commentCount,
        bookmarkCount: post.bookmarkCount,
        liked: kinds.has('like'),
        bookmarked: kinds.has('bookmark'),
        isPinned: post.isPinned,
        createdAt: post.createdAt.toISOString(),
        comments: post.comments.map((comment) => ({
          id: comment.id,
          body: comment.body,
          author: authorView(comment.author),
          likeCount: comment.likeCount,
          createdAt: comment.createdAt.toISOString(),
        })),
      },
    });
  }),
);

communityRouter.post(
  '/posts',
  writeLimiter,
  asyncHandler(async (req, res) => {
    const body = validate(
      z.object({
        body: z.string().trim().min(3, 'اكتب مشاركة أوضح').max(3000),
        topicId: z.string().optional(),
        visibility: z.enum(['public', 'followers', 'private']).default('public'),
      }),
      req.body,
    );

    if (body.topicId) {
      const topic = await prisma.communityTopic.findFirst({
        where: { id: body.topicId, isActive: true },
        select: { id: true },
      });
      if (!topic) throw ApiError.notFound('الموضوع غير موجود');
    }

    const banned = await prisma.bannedWord.findMany({ where: { isActive: true }, select: { word: true } });
    const lower = body.body.toLowerCase();
    const hasBanned = banned.some((row) => lower.includes(row.word.toLowerCase()));

    const post = await prisma.post.create({
      data: {
        authorId: req.auth!.userId,
        topicId: body.topicId ?? null,
        body: body.body,
        visibility: body.visibility,
        status: hasBanned ? 'pending_review' : 'published',
        publishedAt: hasBanned ? null : new Date(),
      },
    });

    return ok(
      res,
      {
        post: { id: post.id, status: post.status },
        message: hasBanned
          ? 'تم إرسال المشاركة للمراجعة قبل النشر.'
          : 'تم نشر المشاركة.',
      },
      undefined,
      201,
    );
  }),
);

communityRouter.post(
  '/posts/:id/comments',
  writeLimiter,
  asyncHandler(async (req, res) => {
    const id = z.string().min(1).parse(req.params.id);
    const body = validate(
      z.object({
        body: z.string().trim().min(1, 'اكتب تعليقًا').max(1000),
        parentId: z.string().optional(),
      }),
      req.body,
    );

    const post = await prisma.post.findFirst({ where: { id, status: 'published' }, select: { id: true } });
    if (!post) throw ApiError.notFound('المنشور غير موجود');

    const comment = await prisma.$transaction(async (tx) => {
      const created = await tx.comment.create({
        data: {
          postId: id,
          authorId: req.auth!.userId,
          body: body.body,
          parentId: body.parentId ?? null,
        },
      });
      await tx.post.update({ where: { id }, data: { commentCount: { increment: 1 } } });
      return created;
    });

    return ok(
      res,
      {
        comment: {
          id: comment.id,
          body: comment.body,
          createdAt: comment.createdAt.toISOString(),
        },
      },
      undefined,
      201,
    );
  }),
);

communityRouter.post(
  '/posts/:id/reactions',
  writeLimiter,
  asyncHandler(async (req, res) => {
    const id = z.string().min(1).parse(req.params.id);
    const body = validate(z.object({ kind: z.enum(['like', 'bookmark']) }), req.body);
    const userId = req.auth!.userId;

    const post = await prisma.post.findFirst({ where: { id, status: 'published' }, select: { id: true } });
    if (!post) throw ApiError.notFound('المنشور غير موجود');

    const existing = await prisma.postReaction.findUnique({
      where: { userId_postId_kind: { userId, postId: id, kind: body.kind } },
    });

    if (existing) {
      await prisma.$transaction([
        prisma.postReaction.delete({ where: { userId_postId_kind: { userId, postId: id, kind: body.kind } } }),
        prisma.post.update({
          where: { id },
          data: body.kind === 'like' ? { likeCount: { decrement: 1 } } : { bookmarkCount: { decrement: 1 } },
        }),
      ]);
      return ok(res, { active: false });
    }

    await prisma.$transaction([
      prisma.postReaction.create({ data: { userId, postId: id, kind: body.kind } }),
      prisma.post.update({
        where: { id },
        data: body.kind === 'like' ? { likeCount: { increment: 1 } } : { bookmarkCount: { increment: 1 } },
      }),
    ]);
    return ok(res, { active: true });
  }),
);

communityRouter.post(
  '/topics/:id/follow',
  writeLimiter,
  asyncHandler(async (req, res) => {
    const id = z.string().min(1).parse(req.params.id);
    const userId = req.auth!.userId;
    const topic = await prisma.communityTopic.findFirst({ where: { id, isActive: true }, select: { id: true } });
    if (!topic) throw ApiError.notFound('الموضوع غير موجود');

    const existing = await prisma.topicFollow.findUnique({
      where: { userId_topicId: { userId, topicId: id } },
    });
    if (existing) {
      await prisma.topicFollow.delete({ where: { userId_topicId: { userId, topicId: id } } });
      return ok(res, { following: false });
    }
    await prisma.topicFollow.create({ data: { userId, topicId: id } });
    return ok(res, { following: true });
  }),
);

communityRouter.delete(
  '/posts/:id',
  writeLimiter,
  asyncHandler(async (req, res) => {
    const id = z.string().min(1).parse(req.params.id);
    const result = await prisma.post.updateMany({
      where: { id, authorId: req.auth!.userId, status: { not: 'removed' } },
      data: { status: 'removed' },
    });
    if (result.count === 0) throw ApiError.notFound('المنشور غير موجود');
    return ok(res, { removed: true });
  }),
);
