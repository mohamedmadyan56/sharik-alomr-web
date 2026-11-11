import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { asyncHandler, ok } from '../http/envelope';
import { ApiError } from '../http/errors';
import { validate } from '../http/validate';
import { requireAuth } from '../auth/session';
import { persistentRateLimit } from '../security/rateLimit';
import { spendCredits } from '../wallet/credits';

export const callsRouter = Router();

callsRouter.use(requireAuth);

const callLimiter = persistentRateLimit({
  name: 'calls:write',
  limit: 60,
  windowSeconds: 60 * 60,
  key: (req) => req.auth?.userId ?? req.ip,
  message: 'محاولات مكالمات كثيرة — حاول بعد قليل',
});

const callUserSelect = {
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

function otherUser(
  call: { callerId: string; caller: { id: string; firstName: string; lastName: string | null; isVerifiedBadge: boolean; verification: string; photos: Array<{ url: string }> }; receiver: { id: string; firstName: string; lastName: string | null; isVerifiedBadge: boolean; verification: string; photos: Array<{ url: string }> } },
  userId: string,
) {
  const user = call.callerId === userId ? call.receiver : call.caller;
  return {
    id: user.id,
    name: [user.firstName, user.lastName].filter(Boolean).join(' '),
    photo: user.photos[0]?.url ?? null,
    verified: user.isVerifiedBadge || user.verification === 'verified',
  };
}

async function activeMatch(first: string, second: string) {
  return prisma.match.findFirst({
    where: {
      status: 'active',
      OR: [
        { userA: first, userB: second },
        { userA: second, userB: first },
      ],
    },
  });
}

callsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = validate(
      z.object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(50).default(20),
      }),
      req.query,
    );
    const userId = req.auth!.userId;
    const where = { OR: [{ callerId: userId }, { receiverId: userId }] };

    const [rows, total] = await Promise.all([
      prisma.call.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: { caller: { select: callUserSelect }, receiver: { select: callUserSelect } },
      }),
      prisma.call.count({ where }),
    ]);

    return ok(res, {
      results: rows.map((call) => ({
        id: call.id,
        type: call.type,
        status: call.status,
        direction: call.callerId === userId ? 'outgoing' : 'incoming',
        user: otherUser(call, userId),
        ratePerMinute: call.ratePerMinute,
        durationSeconds: call.durationSeconds,
        creditsConsumed: call.creditsConsumed,
        startedAt: call.startedAt?.toISOString() ?? null,
        endedAt: call.endedAt?.toISOString() ?? null,
        createdAt: call.createdAt.toISOString(),
      })),
      total,
      page: query.page,
      pages: Math.max(1, Math.ceil(total / query.limit)),
    });
  }),
);

callsRouter.post(
  '/',
  callLimiter,
  asyncHandler(async (req, res) => {
    const body = validate(
      z.object({
        receiverId: z.string().min(1),
        type: z.enum(['voice', 'video']),
      }),
      req.body,
    );
    const userId = req.auth!.userId;
    if (body.receiverId === userId) throw ApiError.badRequest('لا يمكن الاتصال بنفسك');

    const match = await activeMatch(userId, body.receiverId);
    if (!match) throw ApiError.forbidden('المكالمات متاحة بعد التطابق فقط');

    const existing = await prisma.call.findFirst({
      where: {
        status: { in: ['ringing', 'active'] },
        OR: [
          { callerId: userId, receiverId: body.receiverId },
          { callerId: body.receiverId, receiverId: userId },
        ],
      },
    });
    if (existing) throw ApiError.conflict('توجد مكالمة جارية بالفعل');

    const feature = await prisma.featureCatalog.findUnique({
      where: { key: body.type === 'voice' ? 'voice_call' : 'video_call' },
    });
    const rate = feature?.creditCost ?? (body.type === 'voice' ? 20 : 40);
    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    if (!wallet || wallet.balanceCredits < rate) {
      throw ApiError.badRequest('رصيدك لا يكفي لبدء المكالمة', {
        required: rate,
        balance: wallet?.balanceCredits ?? 0,
      });
    }

    const call = await prisma.$transaction(async (tx) => {
      const created = await tx.call.create({
        data: {
          callerId: userId,
          receiverId: body.receiverId,
          type: body.type,
          status: 'ringing',
          ratePerMinute: rate,
        },
      });
      await tx.callEvent.create({ data: { callId: created.id, event: 'ring' } });
      await tx.notification.create({
        data: {
          userId: body.receiverId,
          type: 'call',
          titleAr: 'مكالمة واردة',
          bodyAr: `لديك مكالمة ${body.type === 'voice' ? 'صوتية' : 'مرئية'} واردة.`,
          data: { callId: created.id },
        },
      });
      return created;
    });

    return ok(res, { call: { id: call.id, status: call.status, ratePerMinute: call.ratePerMinute } }, undefined, 201);
  }),
);

callsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = z.string().min(1).parse(req.params.id);
    const userId = req.auth!.userId;
    const call = await prisma.call.findFirst({
      where: { id, OR: [{ callerId: userId }, { receiverId: userId }] },
      include: { caller: { select: callUserSelect }, receiver: { select: callUserSelect }, events: { orderBy: { at: 'asc' } } },
    });
    if (!call) throw ApiError.notFound('المكالمة غير موجودة');

    return ok(res, {
      call: {
        id: call.id,
        type: call.type,
        status: call.status,
        direction: call.callerId === userId ? 'outgoing' : 'incoming',
        user: otherUser(call, userId),
        ratePerMinute: call.ratePerMinute,
        durationSeconds: call.durationSeconds,
        creditsConsumed: call.creditsConsumed,
        startedAt: call.startedAt,
        endedAt: call.endedAt,
        createdAt: call.createdAt,
        events: call.events,
      },
    });
  }),
);

callsRouter.post(
  '/:id/answer',
  callLimiter,
  asyncHandler(async (req, res) => {
    const id = z.string().min(1).parse(req.params.id);
    const call = await prisma.call.findFirst({ where: { id, receiverId: req.auth!.userId } });
    if (!call) throw ApiError.notFound('المكالمة غير موجودة');
    if (call.status !== 'ringing') throw ApiError.badRequest('المكالمة لم تعد بانتظار الرد');

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.call.update({
        where: { id },
        data: { status: 'active', startedAt: new Date() },
      });
      await tx.callEvent.create({ data: { callId: id, event: 'answer' } });
      return result;
    });

    return ok(res, { call: { id: updated.id, status: updated.status, startedAt: updated.startedAt } });
  }),
);

callsRouter.post(
  '/:id/reject',
  callLimiter,
  asyncHandler(async (req, res) => {
    const id = z.string().min(1).parse(req.params.id);
    const call = await prisma.call.findFirst({ where: { id, receiverId: req.auth!.userId } });
    if (!call) throw ApiError.notFound('المكالمة غير موجودة');
    if (call.status !== 'ringing') throw ApiError.badRequest('لا يمكن رفض هذه المكالمة');

    await prisma.$transaction([
      prisma.call.update({ where: { id }, data: { status: 'rejected', endedAt: new Date() } }),
      prisma.callEvent.create({ data: { callId: id, event: 'end' } }),
    ]);
    return ok(res, { rejected: true });
  }),
);

callsRouter.post(
  '/:id/end',
  callLimiter,
  asyncHandler(async (req, res) => {
    const id = z.string().min(1).parse(req.params.id);
    const userId = req.auth!.userId;
    const call = await prisma.call.findFirst({
      where: { id, OR: [{ callerId: userId }, { receiverId: userId }] },
    });
    if (!call) throw ApiError.notFound('المكالمة غير موجودة');
    if (call.status === 'completed' || call.status === 'rejected' || call.status === 'failed') {
      return ok(res, { call });
    }

    const endedAt = new Date();
    const durationSeconds = call.startedAt
      ? Math.max(0, Math.floor((endedAt.getTime() - call.startedAt.getTime()) / 1000))
      : 0;
    const minutes = Math.max(1, Math.ceil(durationSeconds / 60));
    const cost = call.ratePerMinute * minutes;

    const updated = await prisma.$transaction(async (tx) => {
      let creditsConsumed = 0;
      const wallet = await tx.wallet.findUnique({ where: { userId: call.callerId } });
      if (wallet && cost > 0) {
        creditsConsumed = Math.min(cost, wallet.balanceCredits);
        if (creditsConsumed > 0) {
          await spendCredits(tx, call.callerId, creditsConsumed, call.type === 'voice' ? 'voice_call' : 'video_call', 'مكالمة');
        }
      }

      const result = await tx.call.update({
        where: { id },
        data: {
          status: 'completed',
          endedAt,
          durationSeconds,
          creditsConsumed,
        },
      });
      await tx.callEvent.create({ data: { callId: id, event: 'end' } });
      await tx.notification.create({
        data: {
          userId: call.receiverId === userId ? call.callerId : call.receiverId,
          type: 'call',
          titleAr: 'انتهت المكالمة',
          bodyAr: `مدة المكالمة ${Math.floor(durationSeconds / 60)} دقيقة و${durationSeconds % 60} ثانية.`,
          data: { callId: id },
        },
      });
      return result;
    });

    return ok(res, { call: updated });
  }),
);
