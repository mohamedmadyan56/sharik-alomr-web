import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { asyncHandler, ok } from '../http/envelope';
import { validate } from '../http/validate';
import { requireAuth } from '../auth/session';
import { persistentRateLimit } from '../security/rateLimit';

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);

const writeLimiter = persistentRateLimit({
  name: 'notifications:write',
  limit: 240,
  windowSeconds: 60 * 60,
  key: (req) => req.auth?.userId ?? req.ip,
  message: 'طلبات كثيرة — حاول بعد قليل',
});

notificationsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = validate(
      z.object({
        unread: z.enum(['true', 'false']).optional(),
        limit: z.coerce.number().int().min(1).max(100).default(50),
        before: z.string().datetime().optional(),
      }),
      req.query,
    );

    const rows = await prisma.notification.findMany({
      where: {
        userId: req.auth!.userId,
        ...(query.unread === 'true' ? { isRead: false } : {}),
        ...(query.before ? { createdAt: { lt: new Date(query.before) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: query.limit,
    });

    const unread = await prisma.notification.count({
      where: { userId: req.auth!.userId, isRead: false },
    });

    return ok(res, {
      results: rows.map((row) => ({
        id: row.id,
        type: row.type,
        title: row.titleAr,
        body: row.bodyAr,
        data: row.data,
        isRead: row.isRead,
        readAt: row.readAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
      })),
      unread,
    });
  }),
);

notificationsRouter.post(
  '/:id/read',
  writeLimiter,
  asyncHandler(async (req, res) => {
    const id = z.string().min(1).parse(req.params.id);
    const result = await prisma.notification.updateMany({
      where: { id, userId: req.auth!.userId },
      data: { isRead: true, readAt: new Date() },
    });
    return ok(res, { read: result.count > 0 });
  }),
);

notificationsRouter.post(
  '/read-all',
  writeLimiter,
  asyncHandler(async (req, res) => {
    const result = await prisma.notification.updateMany({
      where: { userId: req.auth!.userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return ok(res, { read: result.count });
  }),
);

notificationsRouter.delete(
  '/:id',
  writeLimiter,
  asyncHandler(async (req, res) => {
    const id = z.string().min(1).parse(req.params.id);
    await prisma.notification.deleteMany({ where: { id, userId: req.auth!.userId } });
    return ok(res, { removed: true });
  }),
);
