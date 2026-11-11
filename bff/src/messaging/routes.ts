import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { asyncHandler, ok } from '../http/envelope';
import { ApiError } from '../http/errors';
import { validate } from '../http/validate';
import { requireAuth } from '../auth/session';
import { persistentRateLimit } from '../security/rateLimit';

export const messagingRouter = Router();

messagingRouter.use(requireAuth);

const messageLimiter = persistentRateLimit({
  name: 'messages:write',
  limit: 180,
  windowSeconds: 60 * 60,
  key: (req) => req.auth?.userId ?? req.ip,
  message: 'رسائل كثيرة — حاول بعد قليل',
});

const participantSelect = {
  id: true,
  firstName: true,
  lastName: true,
  profileQuality: true,
  verification: true,
  isVerifiedBadge: true,
  photos: {
    where: { status: 'active' as const, category: 'public' as const },
    select: { url: true, isPrimary: true },
    orderBy: [{ isPrimary: 'desc' as const }, { orderIndex: 'asc' as const }],
    take: 1,
  },
} satisfies import('@prisma/client').Prisma.UserSelect;

async function assertParticipant(conversationId: string, userId: string) {
  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
    include: { conversation: true },
  });
  if (!participant || participant.leftAt) throw ApiError.notFound('المحادثة غير موجودة');
  if (participant.conversation.status !== 'active') throw ApiError.badRequest('المحادثة غير متاحة');
  return participant;
}

function otherParticipant(
  participants: Array<{ userId: string; user: { id: string; firstName: string; lastName: string | null; profileQuality: number; verification: string; isVerifiedBadge: boolean; photos: Array<{ url: string; isPrimary: boolean }> } }>,
  userId: string,
) {
  return participants.find((row) => row.userId !== userId)?.user ?? null;
}

// ═══════════════════════ المحادثات ═══════════════════════

messagingRouter.get(
  '/conversations',
  asyncHandler(async (req, res) => {
    const userId = req.auth!.userId;
    const conversations = await prisma.conversation.findMany({
      where: {
        status: 'active',
        participants: { some: { userId, leftAt: null } },
      },
      orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
      take: 100,
      include: {
        participants: { include: { user: { select: participantSelect } } },
        messages: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, body: true, type: true, senderId: true, createdAt: true },
        },
      },
    });

    const results = await Promise.all(
      conversations.map(async (conversation) => {
        const other = otherParticipant(conversation.participants, userId);
        const unread = await prisma.message.count({
          where: {
            conversationId: conversation.id,
            senderId: { not: userId },
            deletedAt: null,
            receipts: { none: { userId } },
          },
        });
        return {
          id: conversation.id,
          matchId: conversation.matchId,
          type: conversation.type,
          lastMessageAt: conversation.lastMessageAt?.toISOString() ?? null,
          createdAt: conversation.createdAt.toISOString(),
          unread,
          user: other
            ? {
                id: other.id,
                name: [other.firstName, other.lastName].filter(Boolean).join(' '),
                photo: other.photos[0]?.url ?? null,
                verified: other.isVerifiedBadge || other.verification === 'verified',
              }
            : null,
          lastMessage: conversation.messages[0]
            ? {
                ...conversation.messages[0],
                createdAt: conversation.messages[0].createdAt.toISOString(),
                mine: conversation.messages[0].senderId === userId,
              }
            : null,
        };
      }),
    );

    return ok(res, { results });
  }),
);

messagingRouter.get(
  '/unread-count',
  asyncHandler(async (req, res) => {
    const userId = req.auth!.userId;
    const conversations = await prisma.conversationParticipant.findMany({
      where: { userId, leftAt: null, conversation: { status: 'active' } },
      select: { conversationId: true },
    });
    const count = await prisma.message.count({
      where: {
        conversationId: { in: conversations.map((row) => row.conversationId) },
        senderId: { not: userId },
        deletedAt: null,
        receipts: { none: { userId } },
      },
    });
    return ok(res, { unread: count });
  }),
);

messagingRouter.get(
  '/conversations/:id',
  asyncHandler(async (req, res) => {
    const id = z.string().min(1).parse(req.params.id);
    const userId = req.auth!.userId;
    await assertParticipant(id, userId);

    const query = validate(
      z.object({
        before: z.string().datetime().optional(),
        limit: z.coerce.number().int().min(1).max(100).default(50),
      }),
      req.query,
    );

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: { participants: { include: { user: { select: participantSelect } } } },
    });
    if (!conversation) throw ApiError.notFound('المحادثة غير موجودة');

    const messages = await prisma.message.findMany({
      where: {
        conversationId: id,
        deletedAt: null,
        ...(query.before ? { createdAt: { lt: new Date(query.before) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: query.limit + 1,
      include: {
        sender: { select: { id: true, firstName: true, lastName: true } },
        attachments: true,
      },
    });

    const hasMore = messages.length > query.limit;
    const page = (hasMore ? messages.slice(0, query.limit) : messages).reverse();

    return ok(res, {
      conversation: {
        id: conversation.id,
        matchId: conversation.matchId,
        status: conversation.status,
        user: otherParticipant(conversation.participants, userId),
      },
      results: page.map((message) => ({
        id: message.id,
        body: message.body,
        type: message.type,
        mine: message.senderId === userId,
        sender: message.sender,
        attachments: message.attachments,
        createdAt: message.createdAt.toISOString(),
      })),
      hasMore,
      nextCursor: hasMore ? page[0]?.createdAt.toISOString() ?? null : null,
    });
  }),
);

messagingRouter.post(
  '/conversations/:id/messages',
  messageLimiter,
  asyncHandler(async (req, res) => {
    const id = z.string().min(1).parse(req.params.id);
    const userId = req.auth!.userId;
    await assertParticipant(id, userId);

    const body = validate(
      z.object({
        body: z.string().trim().min(1, 'اكتب رسالة').max(2000),
        type: z.enum(['text', 'voice', 'image', 'view_once', 'system']).default('text'),
      }),
      req.body,
    );

    const message = await prisma.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: { conversationId: id, senderId: userId, body: body.body, type: body.type },
      });
      await tx.conversation.update({ where: { id }, data: { lastMessageAt: created.createdAt } });

      const participants = await tx.conversationParticipant.findMany({
        where: { conversationId: id, userId: { not: userId }, leftAt: null },
        select: { userId: true },
      });
      const settings = await tx.notificationSettings.findMany({
        where: { userId: { in: participants.map((row) => row.userId) } },
        select: { userId: true, messages: true },
      });
      const allowed = new Set(settings.filter((row) => row.messages).map((row) => row.userId));

      if (participants.length) {
        await tx.notification.createMany({
          data: participants
            .filter((row) => !settings.length || allowed.has(row.userId))
            .map((row) => ({
              userId: row.userId,
              type: 'message',
              titleAr: 'رسالة جديدة',
              bodyAr: 'وصلتك رسالة جديدة في شريك العمر.',
              data: { conversationId: id },
            })),
        });
      }

      return created;
    });

    return ok(
      res,
      {
        message: {
          id: message.id,
          body: message.body,
          type: message.type,
          mine: true,
          createdAt: message.createdAt.toISOString(),
        },
      },
      undefined,
      201,
    );
  }),
);

messagingRouter.post(
  '/conversations/:id/read',
  messageLimiter,
  asyncHandler(async (req, res) => {
    const id = z.string().min(1).parse(req.params.id);
    const userId = req.auth!.userId;
    await assertParticipant(id, userId);

    const unread = await prisma.message.findMany({
      where: {
        conversationId: id,
        senderId: { not: userId },
        deletedAt: null,
        receipts: { none: { userId } },
      },
      select: { id: true },
      take: 500,
    });

    if (unread.length) {
      await prisma.messageReceipt.createMany({
        data: unread.map((message) => ({ messageId: message.id, userId })),
        skipDuplicates: true,
      });
    }

    return ok(res, { read: unread.length });
  }),
);

messagingRouter.post(
  '/conversations/:id/archive',
  messageLimiter,
  asyncHandler(async (req, res) => {
    const id = z.string().min(1).parse(req.params.id);
    await assertParticipant(id, req.auth!.userId);
    await prisma.conversation.update({ where: { id }, data: { status: 'archived' } });
    return ok(res, { archived: true });
  }),
);

// ═══════════════════════ طلبات المحادثة ═══════════════════════

messagingRouter.get(
  '/requests',
  asyncHandler(async (req, res) => {
    const requests = await prisma.messageRequest.findMany({
      where: {
        conversation: { participants: { some: { userId: req.auth!.userId, leftAt: null } } },
        status: 'pending',
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        fromUser: { select: participantSelect },
        conversation: { select: { id: true } },
      },
    });

    return ok(res, {
      results: requests.map((request) => ({
        id: request.id,
        conversationId: request.conversation.id,
        status: request.status,
        createdAt: request.createdAt,
        user: {
          id: request.fromUser.id,
          name: [request.fromUser.firstName, request.fromUser.lastName].filter(Boolean).join(' '),
          photo: request.fromUser.photos[0]?.url ?? null,
        },
      })),
    });
  }),
);

messagingRouter.post(
  '/requests/:id/respond',
  messageLimiter,
  asyncHandler(async (req, res) => {
    const id = z.string().min(1).parse(req.params.id);
    const body = validate(z.object({ action: z.enum(['accept', 'ignore']) }), req.body);
    const userId = req.auth!.userId;

    const request = await prisma.messageRequest.findUnique({
      where: { id },
      include: { conversation: { include: { participants: true } } },
    });
    if (!request) throw ApiError.notFound('الطلب غير موجود');
    if (!request.conversation.participants.some((row) => row.userId === userId)) {
      throw ApiError.forbidden('لا تملك صلاحية على هذا الطلب');
    }

    await prisma.messageRequest.update({
      where: { id },
      data: { status: body.action === 'accept' ? 'accepted' : 'ignored' },
    });

    if (body.action === 'ignore') {
      await prisma.conversation.update({ where: { id: request.conversationId }, data: { status: 'archived' } });
    }

    return ok(res, { status: body.action === 'accept' ? 'accepted' : 'ignored' });
  }),
);
