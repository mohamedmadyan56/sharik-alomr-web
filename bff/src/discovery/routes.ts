import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { asyncHandler, ok } from '../http/envelope';
import { ApiError } from '../http/errors';
import { validate } from '../http/validate';
import { requireAuth } from '../auth/session';
import { assertBasicsComplete, profileCompletion } from '../profile/completion';
import { persistentRateLimit } from '../security/rateLimit';
import { spendCredits } from '../wallet/credits';

export const discoveryRouter = Router();

discoveryRouter.use(requireAuth);

const discoveryLimiter = persistentRateLimit({
  name: 'discovery:read',
  limit: 240,
  windowSeconds: 60 * 60,
  key: (req) => req.auth?.userId ?? req.ip,
  message: 'طلبات كثيرة — حاول بعد قليل',
});

const actionLimiter = persistentRateLimit({
  name: 'discovery:action',
  limit: 120,
  windowSeconds: 60 * 60,
  key: (req) => req.auth?.userId ?? req.ip,
  message: 'إجراءات كثيرة — حاول بعد قليل',
});

const cardSelect = {
  id: true,
  firstName: true,
  lastName: true,
  gender: true,
  dateOfBirth: true,
  city: true,
  country: true,
  accountStatus: true,
  deletedAt: true,
  profileQuality: true,
  verification: true,
  isVerifiedBadge: true,
  lastActiveAt: true,
  profile: {
    select: {
      profession: true,
      education: true,
      heightCm: true,
      maritalStatus: true,
      languages: true,
      smoking: true,
      nationality: true,
    },
  },
  profileAbout: { select: { bio: true, interests: true, personality: true, lifestyle: true } },
  profileMarriage: {
    select: {
      marriageIntent: true,
      marriageTimeline: true,
      wantsChildren: true,
      relocation: true,
      livingPreference: true,
    },
  },
  photos: {
    where: { status: 'active' as const, category: 'public' as const },
    select: { id: true, url: true, isPrimary: true },
    orderBy: [{ isPrimary: 'desc' as const }, { orderIndex: 'asc' as const }],
    take: 4,
  },
  privacy: { select: { profileVisibility: true, searchable: true } },
} satisfies Prisma.UserSelect;

type CardUser = Prisma.UserGetPayload<{ select: typeof cardSelect }>;

function ageFrom(dob: Date | null): number | null {
  if (!dob) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const month = now.getMonth() - dob.getMonth();
  if (month < 0 || (month === 0 && now.getDate() < dob.getDate())) age -= 1;
  return age;
}

function compatibility(user: CardUser, viewer: {
  city?: string | null;
  interests?: string[];
  ageMin?: number | null;
  ageMax?: number | null;
}): number {
  let score = Math.round((user.profileQuality || 0) * 0.45);
  const age = ageFrom(user.dateOfBirth);
  if (age && viewer.ageMin && age >= viewer.ageMin) score += 5;
  if (age && viewer.ageMax && age <= viewer.ageMax) score += 5;
  if (viewer.city && user.city && viewer.city === user.city) score += 10;
  const shared = (viewer.interests ?? []).filter((item) =>
    (user.profileAbout?.interests ?? []).includes(item),
  ).length;
  score += Math.min(20, shared * 6);
  if (user.isVerifiedBadge) score += 4;
  if (user.lastActiveAt && Date.now() - user.lastActiveAt.getTime() < 7 * 24 * 60 * 60 * 1000) score += 5;
  return Math.max(55, Math.min(99, score));
}

function toCard(user: CardUser, viewer: {
  city?: string | null;
  interests?: string[];
  ageMin?: number | null;
  ageMax?: number | null;
}) {
  return {
    id: user.id,
    name: user.firstName,
    age: ageFrom(user.dateOfBirth),
    gender: user.gender,
    city: user.city,
    country: user.country,
    profession: user.profile?.profession ?? null,
    education: user.profile?.education ?? null,
    maritalStatus: user.profile?.maritalStatus ?? null,
    heightCm: user.profile?.heightCm ?? null,
    bio: user.profileAbout?.bio ?? null,
    interests: user.profileAbout?.interests ?? [],
    personality: user.profileAbout?.personality ?? [],
    lifestyle: user.profileAbout?.lifestyle ?? [],
    marriageIntent: user.profileMarriage?.marriageIntent ?? null,
    marriageTimeline: user.profileMarriage?.marriageTimeline ?? null,
    wantsChildren: user.profileMarriage?.wantsChildren ?? null,
    relocation: user.profileMarriage?.relocation ?? null,
    livingPreference: user.profileMarriage?.livingPreference ?? null,
    photo: user.photos.find((photo) => photo.isPrimary)?.url ?? user.photos[0]?.url ?? null,
    photos: user.photos,
    verified: user.isVerifiedBadge || user.verification === 'verified',
    profileQuality: user.profileQuality,
    score: compatibility(user, viewer),
    lastActiveAt: user.lastActiveAt?.toISOString() ?? null,
  };
}

async function viewerContext(userId: string) {
  const [user, preferences, about] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, gender: true, city: true },
    }),
    prisma.userPreferences.findUnique({ where: { userId } }),
    prisma.profileAbout.findUnique({ where: { userId }, select: { interests: true } }),
  ]);
  if (!user) throw ApiError.notFound('المستخدم غير موجود');
  return {
    user,
    preferences,
    viewer: {
      city: user.city,
      interests: about?.interests ?? [],
      ageMin: preferences?.ageMin ?? null,
      ageMax: preferences?.ageMax ?? null,
    },
  };
}

function ageBounds(ageMin?: number | null, ageMax?: number | null): Prisma.DateTimeNullableFilter {
  const now = new Date();
  const filter: Prisma.DateTimeNullableFilter = {};
  if (ageMin) {
    filter.lte = new Date(now.getFullYear() - ageMin, now.getMonth(), now.getDate());
  }
  if (ageMax) {
    filter.gte = new Date(now.getFullYear() - ageMax - 1, now.getMonth(), now.getDate() + 1);
  }
  return filter;
}

function baseCandidateWhere(
  userId: string,
  options: {
    gender?: 'male' | 'female' | null;
    ageMin?: number | null;
    ageMax?: number | null;
    excludeLiked?: boolean;
    excludeMatched?: boolean;
  },
): Prisma.UserWhereInput {
  const conditions: Prisma.UserWhereInput[] = [
    { id: { not: userId } },
    { accountStatus: 'active' },
    { deletedAt: null },
    {
      OR: [
        { privacy: { is: null } },
        { privacy: { is: { searchable: true } } },
      ],
    },
    { blockedUsers: { none: { blockedId: userId } } },
    { blockedBy: { none: { blockerId: userId } } },
  ];

  if (options.gender) conditions.push({ gender: options.gender });
  const dob = ageBounds(options.ageMin, options.ageMax);
  if (Object.keys(dob).length > 0) conditions.push({ dateOfBirth: dob });

  if (options.excludeLiked) {
    conditions.push({ likesReceived: { none: { fromUserId: userId } } });
  }
  if (options.excludeMatched) {
    conditions.push({ matchesAsA: { none: { userB: userId, status: 'active' } } });
    conditions.push({ matchesAsB: { none: { userA: userId, status: 'active' } } });
  }

  return { AND: conditions };
}

function oppositeGender(gender?: string | null): 'male' | 'female' | null {
  if (gender === 'male') return 'female';
  if (gender === 'female') return 'male';
  return null;
}

async function orderedMatch(tx: Prisma.TransactionClient, first: string, second: string) {
  const [userA, userB] = first < second ? [first, second] : [second, first];
  let match = await tx.match.findUnique({ where: { userA_userB: { userA, userB } } });
  if (!match) {
    match = await tx.match.create({ data: { userA, userB } });
  } else if (match.status !== 'active') {
    match = await tx.match.update({
      where: { id: match.id },
      data: { status: 'active', unmatchedAt: null, unmatchedBy: null },
    });
  }

  let conversation = await tx.conversation.findFirst({ where: { matchId: match.id } });
  if (!conversation) {
    conversation = await tx.conversation.create({
      data: {
        matchId: match.id,
        type: 'direct',
        participants: { create: [{ userId: first }, { userId: second }] },
      },
    });
  }

  return { match, conversation };
}

// ═══════════════════════ الرئيسية ═══════════════════════

discoveryRouter.get(
  '/dashboard',
  discoveryLimiter,
  asyncHandler(async (req, res) => {
    const userId = req.auth!.userId;
    const { user, preferences, viewer } = await viewerContext(userId);

    const where = baseCandidateWhere(userId, {
      gender: oppositeGender(user.gender),
      ageMin: preferences?.ageMin,
      ageMax: preferences?.ageMax,
      excludeLiked: true,
      excludeMatched: true,
    });

    const [recommendations, interestsReceived, matches, unread, completion, latest] = await Promise.all([
      prisma.user.count({ where }),
      prisma.like.count({
        where: {
          toUserId: userId,
          action: { in: ['like', 'serious_interest'] },
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.match.count({
        where: { status: 'active', OR: [{ userA: userId }, { userB: userId }] },
      }),
      prisma.notification.count({ where: { userId, isRead: false } }),
      profileCompletion(userId),
      prisma.user.findMany({
        where,
        select: cardSelect,
        orderBy: [{ profileQuality: 'desc' }, { lastActiveAt: 'desc' }],
        take: 4,
      }),
    ]);

    return ok(res, {
      counts: { recommendations, interestsReceived, matches, unreadNotifications: unread },
      completion,
      recommendations: latest.map((row) => toCard(row, viewer)),
    });
  }),
);

// ═══════════════════════ الترشيحات والبحث ═══════════════════════

discoveryRouter.get(
  '/recommendations',
  discoveryLimiter,
  asyncHandler(async (req, res) => {
    await assertBasicsComplete(req.auth!.userId);
    const query = validate(
      z.object({
        limit: z.coerce.number().int().min(1).max(30).default(12),
        cursor: z.string().optional(),
      }),
      req.query,
    );

    const { user, preferences, viewer } = await viewerContext(req.auth!.userId);
    const where = baseCandidateWhere(req.auth!.userId, {
      gender: oppositeGender(user.gender),
      ageMin: preferences?.ageMin,
      ageMax: preferences?.ageMax,
      excludeLiked: true,
      excludeMatched: true,
    });

    const rows = await prisma.user.findMany({
      where,
      select: cardSelect,
      orderBy: [{ profileQuality: 'desc' }, { lastActiveAt: 'desc' }, { id: 'asc' }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });

    const hasMore = rows.length > query.limit;
    const page = hasMore ? rows.slice(0, query.limit) : rows;

    return ok(res, {
      results: page.map((row) => toCard(row, viewer)),
      hasMore,
      nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null,
    });
  }),
);

discoveryRouter.get(
  '/search',
  discoveryLimiter,
  asyncHandler(async (req, res) => {
    const query = validate(
      z.object({
        gender: z.enum(['male', 'female']).optional(),
        ageMin: z.coerce.number().int().min(18).max(80).optional(),
        ageMax: z.coerce.number().int().min(18).max(80).optional(),
        city: z.string().trim().max(60).optional(),
        country: z.string().trim().max(60).optional(),
        education: z.string().trim().max(30).optional(),
        maritalStatus: z.string().trim().max(30).optional(),
        q: z.string().trim().max(100).optional(),
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(30).default(12),
      }),
      req.query,
    );

    const { user, viewer } = await viewerContext(req.auth!.userId);
    const conditions: Prisma.UserWhereInput[] = [
      baseCandidateWhere(req.auth!.userId, {
        gender: query.gender ?? oppositeGender(user.gender),
        ageMin: query.ageMin,
        ageMax: query.ageMax,
        excludeLiked: false,
        excludeMatched: false,
      }),
    ];

    if (query.city) conditions.push({ city: { contains: query.city, mode: 'insensitive' } });
    if (query.country) conditions.push({ country: { equals: query.country, mode: 'insensitive' } });
    if (query.education) conditions.push({ profile: { is: { education: query.education as never } } });
    if (query.maritalStatus) {
      conditions.push({ profile: { is: { maritalStatus: query.maritalStatus as never } } });
    }
    if (query.q) {
      conditions.push({
        OR: [
          { firstName: { contains: query.q, mode: 'insensitive' } },
          { profile: { is: { profession: { contains: query.q, mode: 'insensitive' } } } },
          { profileAbout: { is: { bio: { contains: query.q, mode: 'insensitive' } } } },
        ],
      });
    }

    const where: Prisma.UserWhereInput = { AND: conditions };
    const skip = (query.page - 1) * query.limit;
    const [rows, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: cardSelect,
        orderBy: [{ profileQuality: 'desc' }, { lastActiveAt: 'desc' }],
        skip,
        take: query.limit,
      }),
      prisma.user.count({ where }),
    ]);

    return ok(res, {
      results: rows.map((row) => toCard(row, viewer)),
      total,
      page: query.page,
      pages: Math.max(1, Math.ceil(total / query.limit)),
    });
  }),
);

discoveryRouter.get(
  '/profile/:id',
  discoveryLimiter,
  asyncHandler(async (req, res) => {
    const id = z.string().min(1).parse(req.params.id);
    const userId = req.auth!.userId;

    if (id === userId) {
      const full = await prisma.user.findUnique({ where: { id }, select: cardSelect });
      if (!full) throw ApiError.notFound('الملف غير موجود');
      return ok(res, { profile: toCard(full, {}), isSelf: true });
    }

    const blocked = await prisma.blockedUser.findFirst({
      where: { OR: [{ blockerId: userId, blockedId: id }, { blockerId: id, blockedId: userId }] },
    });
    if (blocked) throw ApiError.forbidden('لا يمكن عرض هذا الملف');

    const target = await prisma.user.findUnique({
      where: { id },
      select: {
        ...cardSelect,
        privacy: { select: { profileVisibility: true, searchable: true } },
      },
    });
    if (!target || target.accountStatus !== 'active' || target.deletedAt) {
      throw ApiError.notFound('الملف غير موجود');
    }

    const match = await prisma.match.findFirst({
      where: {
        status: 'active',
        OR: [
          { userA: userId, userB: id },
          { userA: id, userB: userId },
        ],
      },
    });

    if (target.privacy?.profileVisibility === 'private' && !match) {
      throw ApiError.forbidden('هذا المستخدم اختار إخفاء ملفه');
    }
    if (target.privacy?.profileVisibility === 'matches' && !match) {
      throw ApiError.forbidden('هذا الملف متاح بعد التطابق فقط');
    }

    await prisma.profileView
      .create({ data: { viewerId: userId, viewedId: id } })
      .catch(() => undefined);

    const { viewer } = await viewerContext(userId);
    return ok(res, {
      profile: toCard(target, viewer),
      isSelf: false,
      canMessage: Boolean(match),
      matchId: match?.id ?? null,
    });
  }),
);

// ═══════════════════════ الاهتمامات ═══════════════════════

discoveryRouter.get(
  '/interests',
  discoveryLimiter,
  asyncHandler(async (req, res) => {
    const query = validate(
      z.object({ type: z.enum(['received', 'sent']).default('received') }),
      req.query,
    );
    const userId = req.auth!.userId;

    const rows = await prisma.like.findMany({
      where:
        query.type === 'received'
          ? { toUserId: userId, action: { in: ['like', 'serious_interest'] } }
          : { fromUserId: userId, action: { in: ['like', 'serious_interest'] } },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        from: { select: cardSelect },
        to: { select: cardSelect },
      },
    });

    const { viewer } = await viewerContext(userId);
    const seen = new Set<string>();
    const results = rows
      .filter((row) => {
        const otherId = query.type === 'received' ? row.fromUserId : row.toUserId;
        if (seen.has(otherId)) return false;
        seen.add(otherId);
        return true;
      })
      .map((row) => ({
        id: row.id,
        action: row.action,
        createdAt: row.createdAt.toISOString(),
        user: toCard(query.type === 'received' ? row.from : row.to, viewer),
      }));

    return ok(res, { results, type: query.type });
  }),
);

discoveryRouter.post(
  '/interests/:id/respond',
  actionLimiter,
  asyncHandler(async (req, res) => {
    const id = z.string().min(1).parse(req.params.id);
    const body = validate(z.object({ action: z.enum(['accept', 'decline']) }), req.body);
    const userId = req.auth!.userId;

    const like = await prisma.like.findUnique({ where: { id } });
    if (!like || like.toUserId !== userId) throw ApiError.notFound('الاهتمام غير موجود');

    if (body.action === 'decline') {
      await prisma.like.delete({ where: { id } });
      await prisma.notification.create({
        data: {
          userId: like.fromUserId,
          type: 'interest_declined',
          titleAr: 'تحديث على اهتمامك',
          bodyAr: 'تم إغلاق طلب الاهتمام. نتمنى لك التوفيق في خطوتك القادمة.',
        },
      }).catch(() => undefined);
      return ok(res, { accepted: false });
    }

    const result = await prisma.$transaction(async (tx) => {
      const matched = await orderedMatch(tx, userId, like.fromUserId);
      await tx.notification.create({
        data: {
          userId: like.fromUserId,
          type: 'match',
          titleAr: 'تطابق جديد',
          bodyAr: 'قبل الطرف الآخر اهتمامك — يمكنكما بدء محادثة الآن.',
          data: { matchId: matched.match.id, conversationId: matched.conversation.id },
        },
      });
      return matched;
    });

    return ok(res, {
      accepted: true,
      matchId: result.match.id,
      conversationId: result.conversation.id,
    });
  }),
);

// ═══════════════════════ الإعجاب والتخطّي والمفضلة ═══════════════════════

discoveryRouter.post(
  '/likes',
  actionLimiter,
  asyncHandler(async (req, res) => {
    const body = validate(
      z.object({
        targetId: z.string().min(1),
        action: z.enum(['like', 'pass', 'favorite', 'serious_interest']).default('like'),
      }),
      req.body,
    );
    const userId = req.auth!.userId;
    if (body.targetId === userId) throw ApiError.badRequest('لا يمكن التفاعل مع ملفك الشخصي');

    const target = await prisma.user.findUnique({
      where: { id: body.targetId },
      select: { id: true, accountStatus: true, deletedAt: true },
    });
    if (!target || target.accountStatus !== 'active' || target.deletedAt) {
      throw ApiError.notFound('الملف غير موجود');
    }

    if (body.action === 'favorite') {
      const favorite = await prisma.favorite.upsert({
        where: { userId_targetId: { userId, targetId: body.targetId } },
        create: { userId, targetId: body.targetId },
        update: {},
      });
      return ok(res, { favorite: true, id: favorite.id });
    }

    let cost = 0;
    if (body.action === 'serious_interest') {
      const feature = await prisma.featureCatalog.findUnique({ where: { key: 'serious_interest' } });
      cost = feature?.creditCost ?? 0;
    }

    const result = await prisma.$transaction(async (tx) => {
      if (cost > 0) {
        await spendCredits(tx, userId, cost, 'serious_interest', 'اهتمام جاد', body.targetId);
      }

      const like = await tx.like.upsert({
        where: {
          fromUserId_toUserId_action: {
            fromUserId: userId,
            toUserId: body.targetId,
            action: body.action,
          },
        },
        create: {
          fromUserId: userId,
          toUserId: body.targetId,
          action: body.action,
          costCredits: cost,
        },
        update: { costCredits: cost },
      });

      let matchId: string | null = null;
      let conversationId: string | null = null;

      if (body.action === 'like' || body.action === 'serious_interest') {
        const reciprocal = await tx.like.findFirst({
          where: {
            fromUserId: body.targetId,
            toUserId: userId,
            action: { in: ['like', 'serious_interest'] },
          },
        });

        if (reciprocal) {
          const matched = await orderedMatch(tx, userId, body.targetId);
          matchId = matched.match.id;
          conversationId = matched.conversation.id;
          await tx.notification.create({
            data: {
              userId: body.targetId,
              type: 'match',
              titleAr: 'تطابق جديد',
              bodyAr: 'يوجد اهتمام متبادل — يمكنكما بدء محادثة الآن.',
              data: { matchId, conversationId },
            },
          });
        } else {
          await tx.notification.create({
            data: {
              userId: body.targetId,
              type: 'interest',
              titleAr: 'اهتمام جديد',
              bodyAr: 'وصل اهتمام جديد بملفك. راجعه من قسم الاهتمامات.',
            },
          });
        }
      }

      return { like, matchId, conversationId };
    });

    return ok(res, {
      action: body.action,
      id: result.like.id,
      matched: Boolean(result.matchId),
      matchId: result.matchId,
      conversationId: result.conversationId,
      costCredits: cost,
      balance: (await prisma.wallet.findUnique({ where: { userId } }))?.balanceCredits ?? 0,
    });
  }),
);

discoveryRouter.get(
  '/favorites',
  discoveryLimiter,
  asyncHandler(async (req, res) => {
    const rows = await prisma.favorite.findMany({
      where: { userId: req.auth!.userId },
      orderBy: { createdAt: 'desc' },
      include: { target: { select: cardSelect } },
    });
    const { viewer } = await viewerContext(req.auth!.userId);
    return ok(res, { results: rows.map((row) => ({ id: row.id, createdAt: row.createdAt, user: toCard(row.target, viewer) })) });
  }),
);

discoveryRouter.delete(
  '/favorites/:targetId',
  actionLimiter,
  asyncHandler(async (req, res) => {
    const targetId = z.string().min(1).parse(req.params.targetId);
    await prisma.favorite.deleteMany({ where: { userId: req.auth!.userId, targetId } });
    return ok(res, { removed: true });
  }),
);

// ═══════════════════════ التطابقات ═══════════════════════

discoveryRouter.get(
  '/matches',
  discoveryLimiter,
  asyncHandler(async (req, res) => {
    const userId = req.auth!.userId;
    const matches = await prisma.match.findMany({
      where: { status: 'active', OR: [{ userA: userId }, { userB: userId }] },
      orderBy: { matchedAt: 'desc' },
      include: {
        a: { select: cardSelect },
        b: { select: cardSelect },
      },
    });

    const { viewer } = await viewerContext(userId);
    return ok(res, {
      results: matches.map((match) => ({
        id: match.id,
        matchedAt: match.matchedAt,
        user: toCard(match.userA === userId ? match.b : match.a, viewer),
      })),
    });
  }),
);

discoveryRouter.delete(
  '/matches/:id',
  actionLimiter,
  asyncHandler(async (req, res) => {
    const id = z.string().min(1).parse(req.params.id);
    const userId = req.auth!.userId;
    const match = await prisma.match.findFirst({
      where: { id, status: 'active', OR: [{ userA: userId }, { userB: userId }] },
    });
    if (!match) throw ApiError.notFound('التطابق غير موجود');

    await prisma.$transaction([
      prisma.match.update({
        where: { id },
        data: { status: 'unmatched', unmatchedAt: new Date(), unmatchedBy: userId },
      }),
      prisma.conversation.updateMany({ where: { matchId: id }, data: { status: 'archived' } }),
    ]);

    return ok(res, { unmatched: true });
  }),
);

// ═══════════════════════ الحظر والإبلاغ ═══════════════════════

discoveryRouter.get(
  '/blocked',
  discoveryLimiter,
  asyncHandler(async (req, res) => {
    const rows = await prisma.blockedUser.findMany({
      where: { blockerId: req.auth!.userId },
      include: { blocked: { select: cardSelect } },
    });
    const { viewer } = await viewerContext(req.auth!.userId);
    return ok(res, { results: rows.map((row) => ({ id: row.id, createdAt: row.createdAt, user: toCard(row.blocked, viewer) })) });
  }),
);

discoveryRouter.post(
  '/block/:targetId',
  actionLimiter,
  asyncHandler(async (req, res) => {
    const targetId = z.string().min(1).parse(req.params.targetId);
    if (targetId === req.auth!.userId) throw ApiError.badRequest('لا يمكن حظر نفسك');
    const body = validate(z.object({ reason: z.string().trim().max(200).optional() }), req.body);

    await prisma.blockedUser.upsert({
      where: { blockerId_blockedId: { blockerId: req.auth!.userId, blockedId: targetId } },
      create: { blockerId: req.auth!.userId, blockedId: targetId, reason: body.reason ?? null },
      update: { reason: body.reason ?? null },
    });

    return ok(res, { blocked: true });
  }),
);

discoveryRouter.delete(
  '/block/:targetId',
  actionLimiter,
  asyncHandler(async (req, res) => {
    const targetId = z.string().min(1).parse(req.params.targetId);
    await prisma.blockedUser.deleteMany({ where: { blockerId: req.auth!.userId, blockedId: targetId } });
    return ok(res, { unblocked: true });
  }),
);

discoveryRouter.get(
  '/report-reasons',
  discoveryLimiter,
  asyncHandler(async (_req, res) => {
    const reasons = await prisma.reportReason.findMany({ where: { isActive: true }, orderBy: { labelAr: 'asc' } });
    return ok(res, { reasons });
  }),
);

discoveryRouter.post(
  '/reports',
  actionLimiter,
  asyncHandler(async (req, res) => {
    const body = validate(
      z.object({
        targetType: z.enum(['user', 'post', 'comment', 'message', 'call', 'photo', 'article']),
        targetId: z.string().min(1),
        reasonId: z.string().optional(),
        details: z.string().trim().max(1000).optional(),
      }),
      req.body,
    );

    const report = await prisma.report.create({
      data: {
        reference: `RP-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString('hex').toUpperCase()}`,
        reporterId: req.auth!.userId,
        targetType: body.targetType,
        targetId: body.targetId,
        reasonId: body.reasonId ?? null,
        details: body.details ?? null,
      },
    });

    return ok(res, { report: { id: report.id, reference: report.reference, status: report.status } }, undefined, 201);
  }),
);

// ═══════════════════════ من شاهد ملفي ═══════════════════════

discoveryRouter.get(
  '/views',
  discoveryLimiter,
  asyncHandler(async (req, res) => {
    const rows = await prisma.profileView.findMany({
      where: { viewedId: req.auth!.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { viewer: { select: cardSelect } },
    });

    const { viewer } = await viewerContext(req.auth!.userId);
    const seen = new Set<string>();
    const results = rows
      .filter((row) => {
        if (seen.has(row.viewerId)) return false;
        seen.add(row.viewerId);
        return true;
      })
      .map((row) => ({ id: row.id, viewedAt: row.createdAt, user: toCard(row.viewer, viewer) }));

    return ok(res, { results });
  }),
);
