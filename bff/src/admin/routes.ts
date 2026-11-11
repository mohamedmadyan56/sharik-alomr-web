import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import {
  AccountStatus,
  AdminStatus,
  ArticleStatus,
  ModerationAction,
  NotificationChannel,
  PostStatus,
  Prisma,
  ReportStatus,
  VerificationPipelineStatus,
} from '@prisma/client';
import { prisma } from '../db';
import { asyncHandler, ok } from '../http/envelope';
import { ApiError } from '../http/errors';
import { validate } from '../http/validate';
import { assertLoginAllowed, persistentRateLimit } from '../security/rateLimit';
import {
  audit,
  createAdminSession,
  destroyAdminSession,
  loadAdmin,
  readAdminSession,
  requireAdmin,
  requirePermission,
  revokeAdminSessions,
  type AdminWithAccess,
} from './session';
import { fulfillPayment } from '../wallet/payments';
import {
  adminTwoFactorChallengeTtlSeconds,
  createAdminTwoFactorChallenge,
  decryptTotpSecret,
  encryptTotpSecret,
  generateTotpSecret,
  readAdminTwoFactorChallenge,
  totpUri,
  verifyTotpCode,
} from './totp';

export const adminRouter = Router();

const adminLoginLimiter = persistentRateLimit({
  name: 'admin:login',
  limit: 15,
  windowSeconds: 15 * 60,
  message: 'محاولات دخول إدارية كثيرة — حاول بعد قليل',
});

const adminWriteLimiter = persistentRateLimit({
  name: 'admin:write',
  limit: 600,
  windowSeconds: 60 * 60,
  key: (req) => req.admin?.adminId ?? req.ip,
  message: 'إجراءات إدارية كثيرة — حاول بعد قليل',
});

const adminTwoFactorLimiter = persistentRateLimit({
  name: 'admin:2fa',
  limit: 10,
  windowSeconds: 10 * 60,
  key: (req) => req.ip,
  message: 'محاولات تحقق كثيرة — حاول بعد عشر دقائق',
});

const totpCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'كود التحقق ٦ أرقام');

const passwordSchema = z.string().min(10, 'كلمة مرور الإدارة ١٠ أحرف على الأقل').max(128);

function publicAdmin(admin: AdminWithAccess) {
  return {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    phone: admin.phone,
    avatarUrl: admin.avatarUrl,
    status: admin.status,
    twoFactorEnabled: admin.twoFactorEnabled,
    lastLoginAt: admin.lastLoginAt,
    createdAt: admin.createdAt,
    roles: admin.roles.map((row) => row.role),
    permissions: Array.from(admin.permissions).filter((key) => key !== '*'),
    isSuperAdmin: admin.permissions.has('*'),
  };
}

// ═══════════════════════ مصادقة الإدارة ═══════════════════════

adminRouter.post(
  '/auth/login',
  adminLoginLimiter,
  asyncHandler(async (req, res) => {
    const body = validate(
      z.object({
        email: z.string().trim().email('بريد إداري غير صالح').transform((value) => value.toLowerCase()),
        password: z.string().min(1, 'كلمة المرور مطلوبة').max(128),
      }),
      req.body,
    );

    await assertLoginAllowed({ email: body.email, ip: req.ip });

    const admin = await prisma.admin.findUnique({ where: { email: body.email } });
    const valid = admin ? bcrypt.compareSync(body.password, admin.passwordHash) : false;

    if (!admin || !valid) {
      await prisma.loginAttempt
        .create({
          data: {
            email: body.email,
            success: false,
            reason: 'admin_bad_credentials',
            ipAddress: req.ip,
            deviceId: 'web-admin',
          },
        })
        .catch(() => undefined);
      throw ApiError.unauthorized('بيانات الدخول الإدارية غير صحيحة');
    }

    if (admin.status !== 'active') throw new ApiError('ACCOUNT_SUSPENDED', 'الحساب الإداري موقوف');

    // لا تُنشأ جلسة إدارية قبل إتمام التحقق بخطوتين إن كان مفعّلًا.
    if (admin.twoFactorEnabled) {
      if (!admin.twoFactorSecret) {
        throw ApiError.forbidden(
          'التحقق بخطوتين مفعّل لكنه غير مهيأ — تواصل مع مشرف عام لإعادة ضبطه',
        );
      }
      await prisma.loginAttempt
        .create({
          data: {
            email: body.email,
            success: true,
            reason: 'admin_2fa_challenge',
            ipAddress: req.ip,
            deviceId: 'web-admin',
          },
        })
        .catch(() => undefined);
      return ok(
        res,
        {
          twoFactorRequired: true,
          challenge: createAdminTwoFactorChallenge(admin.id),
          expiresInSeconds: adminTwoFactorChallengeTtlSeconds(),
        },
        { next: 'POST /api/admin/auth/2fa/verify' },
      );
    }

    await prisma.admin.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
    await createAdminSession(admin.id, req, res);
    await prisma.loginAttempt
      .create({
        data: { email: body.email, success: true, reason: 'admin_login', ipAddress: req.ip, deviceId: 'web-admin' },
      })
      .catch(() => undefined);
    await audit({
      adminId: admin.id,
      actorRole: 'admin',
      action: 'admin.login',
      targetType: 'admin',
      targetId: admin.id,
      req,
    });

    const current = await loadAdmin(admin.id);
    return ok(res, { admin: current ? publicAdmin(current) : null });
  }),
);

// ═══════════════════════ الخطوة الثانية للإدارة (TOTP) ═══════════════════════

adminRouter.post(
  '/auth/2fa/verify',
  adminTwoFactorLimiter,
  asyncHandler(async (req, res) => {
    const body = validate(
      z.object({
        challenge: z.string().min(20).max(2048),
        code: totpCodeSchema,
      }),
      req.body,
    );

    const adminId = readAdminTwoFactorChallenge(body.challenge);
    const admin = await prisma.admin.findUnique({ where: { id: adminId } });
    if (!admin) throw ApiError.unauthorized('تحدي التحقق غير صالح');
    if (admin.status !== 'active') {
      throw new ApiError('ACCOUNT_SUSPENDED', 'الحساب الإداري موقوف');
    }
    if (!admin.twoFactorEnabled || !admin.twoFactorSecret) {
      throw ApiError.badRequest('التحقق بخطوتين غير مفعّل على هذا الحساب');
    }

    if (!verifyTotpCode(decryptTotpSecret(admin.twoFactorSecret), body.code)) {
      await prisma.loginAttempt
        .create({
          data: {
            email: admin.email,
            success: false,
            reason: 'admin_2fa_bad_code',
            ipAddress: req.ip,
            deviceId: 'web-admin',
          },
        })
        .catch(() => undefined);
      throw ApiError.unauthorized('كود التحقق غير صحيح');
    }

    await prisma.admin.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });
    await createAdminSession(admin.id, req, res);
    await prisma.loginAttempt
      .create({
        data: {
          email: admin.email,
          success: true,
          reason: 'admin_2fa',
          ipAddress: req.ip,
          deviceId: 'web-admin',
        },
      })
      .catch(() => undefined);
    await audit({
      adminId: admin.id,
      actorRole: 'admin',
      action: 'admin.login_2fa',
      targetType: 'admin',
      targetId: admin.id,
      req,
    });

    const current = await loadAdmin(admin.id);
    return ok(res, { admin: current ? publicAdmin(current) : null });
  }),
);

adminRouter.get(
  '/auth/me',
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const admin = res.locals.admin as AdminWithAccess;
    return ok(res, { admin: publicAdmin(admin) });
  }),
);

adminRouter.post(
  '/auth/logout',
  asyncHandler(async (req, res) => {
    const current = await readAdminSession(req);
    await destroyAdminSession(req, res);
    if (current) {
      await audit({ adminId: current.admin.id, action: 'admin.logout', req });
    }
    return ok(res, { loggedOut: true });
  }),
);

adminRouter.post(
  '/auth/change-password',
  requireAdmin,
  adminWriteLimiter,
  asyncHandler(async (req, res) => {
    const body = validate(
      z.object({
        currentPassword: z.string().min(1, 'كلمة المرور الحالية مطلوبة'),
        newPassword: passwordSchema,
      }),
      req.body,
    );
    const admin = req.admin!;
    const row = await prisma.admin.findUnique({ where: { id: admin.adminId } });
    if (!row) throw ApiError.notFound('الحساب الإداري غير موجود');
    if (!bcrypt.compareSync(body.currentPassword, row.passwordHash)) {
      throw ApiError.unauthorized('كلمة المرور الحالية غير صحيحة');
    }

    await prisma.admin.update({
      where: { id: row.id },
      data: { passwordHash: bcrypt.hashSync(body.newPassword, 12) },
    });
    await revokeAdminSessions(row.id, admin.sessionId);
    await audit({ adminId: row.id, action: 'admin.password_change', targetType: 'admin', targetId: row.id, req });

    return ok(res, { changed: true, otherSessionsRevoked: true });
  }),
);

adminRouter.get(
  '/auth/2fa/status',
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const admin = res.locals.admin as AdminWithAccess;
    return ok(res, {
      enabled: admin.twoFactorEnabled,
      pending: !admin.twoFactorEnabled && Boolean(admin.twoFactorSecret),
    });
  }),
);

adminRouter.post(
  '/auth/2fa/setup',
  requireAdmin,
  adminWriteLimiter,
  asyncHandler(async (req, res) => {
    const admin = res.locals.admin as AdminWithAccess;
    if (admin.twoFactorEnabled) {
      throw ApiError.conflict('التحقق بخطوتين مفعّل بالفعل — أوقفه أولًا لإعادة الإعداد');
    }

    const secret = generateTotpSecret();
    await prisma.admin.update({
      where: { id: admin.id },
      data: { twoFactorSecret: encryptTotpSecret(secret), twoFactorEnabled: false },
    });
    await audit({
      adminId: admin.id,
      action: 'admin.2fa_setup',
      targetType: 'admin',
      targetId: admin.id,
      req,
    });

    return ok(res, {
      secret,
      otpauthUri: totpUri(secret, admin.email),
      issuer: 'Sharik Alomr',
      account: admin.email,
      digits: 6,
      period: 30,
    });
  }),
);

adminRouter.post(
  '/auth/2fa/enable',
  requireAdmin,
  adminWriteLimiter,
  asyncHandler(async (req, res) => {
    const body = validate(z.object({ code: totpCodeSchema }), req.body);
    const admin = res.locals.admin as AdminWithAccess;
    if (admin.twoFactorEnabled) throw ApiError.conflict('التحقق بخطوتين مفعّل بالفعل');
    if (!admin.twoFactorSecret) {
      throw ApiError.badRequest('ابدأ إعداد التحقق بخطوتين أولًا');
    }
    if (!verifyTotpCode(decryptTotpSecret(admin.twoFactorSecret), body.code)) {
      throw ApiError.unauthorized('كود التحقق غير صحيح — تأكد من ساعة الجهاز وحاول مرة أخرى');
    }

    await prisma.admin.update({
      where: { id: admin.id },
      data: { twoFactorEnabled: true },
    });
    const revoked = await revokeAdminSessions(admin.id, req.admin!.sessionId);
    await audit({
      adminId: admin.id,
      action: 'admin.2fa_enable',
      targetType: 'admin',
      targetId: admin.id,
      req,
    });

    return ok(res, { enabled: true, otherSessionsRevoked: revoked });
  }),
);

adminRouter.post(
  '/auth/2fa/disable',
  requireAdmin,
  adminWriteLimiter,
  asyncHandler(async (req, res) => {
    const body = validate(
      z.object({
        password: z.string().min(1, 'كلمة المرور مطلوبة'),
        code: totpCodeSchema,
      }),
      req.body,
    );
    const admin = res.locals.admin as AdminWithAccess;
    if (!admin.twoFactorEnabled) {
      throw ApiError.badRequest('التحقق بخطوتين غير مفعّل');
    }
    if (!bcrypt.compareSync(body.password, admin.passwordHash)) {
      throw ApiError.unauthorized('كلمة المرور غير صحيحة');
    }
    if (
      !admin.twoFactorSecret ||
      !verifyTotpCode(decryptTotpSecret(admin.twoFactorSecret), body.code)
    ) {
      throw ApiError.unauthorized('كود التحقق غير صحيح');
    }

    await prisma.admin.update({
      where: { id: admin.id },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });
    const revoked = await revokeAdminSessions(admin.id, req.admin!.sessionId);
    await audit({
      adminId: admin.id,
      action: 'admin.2fa_disable',
      targetType: 'admin',
      targetId: admin.id,
      req,
    });

    return ok(res, { enabled: false, otherSessionsRevoked: revoked });
  }),
);

adminRouter.use(requireAdmin);
adminRouter.use(adminWriteLimiter);

// ═══════════════════════ نظرة عامة ═══════════════════════

adminRouter.get(
  '/overview',
  requirePermission('users.view'),
  asyncHandler(async (_req, res) => {
    const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      users,
      newUsers7,
      activeUsers30,
      pendingVerifications,
      openReports,
      matches,
      messages,
      activeSubscriptions,
      revenue,
      recentAudit,
      recentUsers,
      signups,
      revenueSeries,
      topCities,
    ] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { createdAt: { gte: since7 }, deletedAt: null } }),
      prisma.user.count({ where: { lastActiveAt: { gte: since30 }, deletedAt: null } }),
      prisma.verificationRequest.count({ where: { status: { in: ['pending', 'processing'] } } }),
      prisma.report.count({ where: { status: { in: ['open', 'reviewing'] } } }),
      prisma.match.count({ where: { status: 'active' } }),
      prisma.message.count({ where: { deletedAt: null } }),
      prisma.subscription.count({ where: { status: 'active', expiresAt: { gt: new Date() } } }),
      prisma.payment.aggregate({ where: { status: 'succeeded' }, _sum: { amount: true } }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: { actorAdmin: { select: { name: true, email: true } } },
      }),
      prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
          city: true,
          accountStatus: true,
          verification: true,
          createdAt: true,
        },
      }),
      prisma.$queryRaw<Array<{ day: string; count: number }>>`
        SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day, count(*)::int AS count
        FROM users
        WHERE created_at >= now() - interval '14 days' AND deleted_at IS NULL
        GROUP BY 1 ORDER BY 1
      `,
      prisma.$queryRaw<Array<{ day: string; amount: number }>>`
        SELECT to_char(date_trunc('day', paid_at), 'YYYY-MM-DD') AS day, coalesce(sum(amount), 0)::int AS amount
        FROM payments
        WHERE status = 'succeeded' AND paid_at >= now() - interval '14 days'
        GROUP BY 1 ORDER BY 1
      `,
      prisma.user.groupBy({
        by: ['city'],
        where: { city: { not: null }, deletedAt: null },
        _count: { _all: true },
        orderBy: { _count: { city: 'desc' } },
        take: 6,
      }),
    ]);

    return ok(res, {
      counts: {
        users,
        newUsers7,
        activeUsers30,
        pendingVerifications,
        openReports,
        matches,
        messages,
        activeSubscriptions,
        revenue: revenue._sum.amount ?? 0,
      },
      recentAudit,
      recentUsers,
      signups,
      revenueSeries,
      topCities: topCities.map((row) => ({ city: row.city, count: row._count._all })),
    });
  }),
);

// ═══════════════════════ المستخدمون ═══════════════════════

adminRouter.get(
  '/users',
  requirePermission('users.view'),
  asyncHandler(async (req, res) => {
    const query = validate(
      z.object({
        q: z.string().trim().max(100).optional(),
        status: z.nativeEnum(AccountStatus).optional(),
        verification: z.nativeEnum(VerificationPipelineStatus).optional(),
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(25),
      }),
      req.query,
    );

    const conditions: Prisma.UserWhereInput[] = [];
    if (query.status) conditions.push({ accountStatus: query.status });
    if (query.q) {
      conditions.push({
        OR: [
          { firstName: { contains: query.q, mode: 'insensitive' } },
          { lastName: { contains: query.q, mode: 'insensitive' } },
          { phone: { contains: query.q } },
          { email: { contains: query.q, mode: 'insensitive' } },
        ],
      });
    }
    const where: Prisma.UserWhereInput = conditions.length ? { AND: conditions } : {};

    const [rows, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
          gender: true,
          city: true,
          country: true,
          accountStatus: true,
          verification: true,
          isVerifiedBadge: true,
          profileQuality: true,
          createdAt: true,
          lastActiveAt: true,
          _count: { select: { reportsMade: true, matchesAsA: true, matchesAsB: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return ok(res, {
      results: rows,
      total,
      page: query.page,
      pages: Math.max(1, Math.ceil(total / query.limit)),
    });
  }),
);

adminRouter.patch(
  '/users/:id/status',
  requirePermission('users.suspend'),
  asyncHandler(async (req, res) => {
    const id = z.string().min(1).parse(req.params.id);
    const body = validate(
      z.object({
        status: z.nativeEnum(AccountStatus),
        reason: z.string().trim().min(3, 'سبب الإجراء مطلوب').max(500),
      }),
      req.body,
    );

    const user = await prisma.user.findUnique({ where: { id }, select: { id: true, accountStatus: true } });
    if (!user) throw ApiError.notFound('المستخدم غير موجود');
    if (
      body.status === 'deleted' &&
      !req.admin!.permissions.has('*') &&
      !req.admin!.permissions.has('users.delete')
    ) {
      throw ApiError.forbidden('حذف الحساب يحتاج صلاحية users.delete');
    }

    await prisma.user.update({
      where: { id },
      data: {
        accountStatus: body.status,
        ...(body.status === 'deleted' ? { deletedAt: new Date() } : {}),
      },
    });

    if (body.status !== 'active') {
      await prisma.webSession.deleteMany({ where: { userId: id } });
    }

    await prisma.notification.create({
      data: {
        userId: id,
        type: 'account',
        titleAr: 'تحديث على حالة الحساب',
        bodyAr:
          body.status === 'active'
            ? 'تم إعادة تفعيل حسابك.'
            : `تم تغيير حالة الحساب إلى ${body.status}. للاستفسار تواصل مع الدعم.`,
      },
    }).catch(() => undefined);

    await audit({
      adminId: req.admin!.adminId,
      actorRole: req.admin!.roles[0],
      action: 'user.status_change',
      targetType: 'user',
      targetId: id,
      oldValue: { accountStatus: user.accountStatus },
      newValue: { accountStatus: body.status },
      reason: body.reason,
      req,
    });

    return ok(res, { updated: true, status: body.status });
  }),
);

// ═══════════════════════ التوثيق ═══════════════════════

adminRouter.get(
  '/verifications',
  requirePermission('verification.review'),
  asyncHandler(async (req, res) => {
    const query = validate(
      z.object({
        status: z.nativeEnum(VerificationPipelineStatus).optional(),
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(25),
      }),
      req.query,
    );
    const where = query.status ? { status: query.status } : {};
    const [rows, total] = await Promise.all([
      prisma.verificationRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true,
              city: true,
              verification: true,
              profileQuality: true,
            },
          },
          steps: true,
        },
      }),
      prisma.verificationRequest.count({ where }),
    ]);
    return ok(res, { results: rows, total, page: query.page, pages: Math.max(1, Math.ceil(total / query.limit)) });
  }),
);

adminRouter.patch(
  '/verifications/:id',
  requirePermission('verification.approve'),
  asyncHandler(async (req, res) => {
    const id = z.string().min(1).parse(req.params.id);
    const body = validate(
      z.object({
        status: z.enum(['approved', 'rejected']),
        reason: z.string().trim().max(500).optional(),
      }),
      req.body,
    );

    const request = await prisma.verificationRequest.findUnique({ where: { id } });
    if (!request) throw ApiError.notFound('طلب التوثيق غير موجود');

    await prisma.$transaction([
      prisma.verificationRequest.update({
        where: { id },
        data: {
          status: body.status,
          reviewedAt: new Date(),
          reviewedBy: req.admin!.adminId,
          ...(body.status === 'rejected' && body.reason
            ? { rejectionReasons: [body.reason] as Prisma.InputJsonValue }
            : {}),
        },
      }),
      prisma.user.update({
        where: { id: request.userId },
        data: {
          verification: body.status === 'approved' ? 'verified' : 'rejected',
          isVerifiedBadge: body.status === 'approved',
        },
      }),
      prisma.notification.create({
        data: {
          userId: request.userId,
          type: 'verification',
          titleAr: body.status === 'approved' ? 'تم توثيق حسابك' : 'تحديث على طلب التوثيق',
          bodyAr:
            body.status === 'approved'
              ? 'تمت الموافقة على طلب التوثيق. علامة التوثيق ظاهرة الآن.'
              : body.reason ?? 'لم يتم قبول طلب التوثيق. يمكنك إعادة التقديم لاحقًا.',
        },
      }),
    ]);

    await audit({
      adminId: req.admin!.adminId,
      action: 'verification.review',
      targetType: 'verification',
      targetId: id,
      oldValue: { status: request.status },
      newValue: { status: body.status, reason: body.reason ?? null },
      req,
    });

    return ok(res, { reviewed: true, status: body.status });
  }),
);

// ═══════════════════════ البلاغات ═══════════════════════

adminRouter.get(
  '/reports',
  requirePermission('moderation.reports'),
  asyncHandler(async (req, res) => {
    const query = validate(
      z.object({
        status: z.nativeEnum(ReportStatus).optional(),
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(25),
      }),
      req.query,
    );
    const where = query.status ? { status: query.status } : {};
    const [rows, total] = await Promise.all([
      prisma.report.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          reporter: { select: { id: true, firstName: true, lastName: true, phone: true } },
          reason: true,
        },
      }),
      prisma.report.count({ where }),
    ]);
    return ok(res, { results: rows, total, page: query.page, pages: Math.max(1, Math.ceil(total / query.limit)) });
  }),
);

adminRouter.patch(
  '/reports/:id',
  requirePermission('moderation.actions'),
  asyncHandler(async (req, res) => {
    const id = z.string().min(1).parse(req.params.id);
    const body = validate(
      z.object({
        status: z.nativeEnum(ReportStatus),
        action: z.nativeEnum(ModerationAction).optional(),
        reason: z.string().trim().max(500).optional(),
      }),
      req.body,
    );

    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) throw ApiError.notFound('البلاغ غير موجود');

    await prisma.$transaction(async (tx) => {
      await tx.report.update({
        where: { id },
        data: {
          status: body.status,
          resolvedAt: ['resolved', 'dismissed'].includes(body.status) ? new Date() : null,
          resolvedBy: req.admin!.adminId,
        },
      });

      if (body.action) {
        await tx.moderationLog.create({
          data: {
            adminId: req.admin!.adminId,
            targetType: report.targetType,
            targetId: report.targetId,
            action: body.action,
            reason: body.reason ?? null,
          },
        });

        if (report.targetType === 'user') {
          if (body.action === 'suspend') {
            await tx.user.update({ where: { id: report.targetId }, data: { accountStatus: 'suspended' } });
            await tx.webSession.deleteMany({ where: { userId: report.targetId } });
          }
          if (body.action === 'ban') {
            await tx.user.update({ where: { id: report.targetId }, data: { accountStatus: 'banned' } });
            await tx.webSession.deleteMany({ where: { userId: report.targetId } });
          }
        }
        if (report.targetType === 'post' && body.action === 'remove') {
          await tx.post.update({ where: { id: report.targetId }, data: { status: 'removed' } }).catch(() => undefined);
        }
        if (report.targetType === 'comment' && body.action === 'remove') {
          await tx.comment.update({ where: { id: report.targetId }, data: { status: 'removed' } }).catch(() => undefined);
        }
      }
    });

    await audit({
      adminId: req.admin!.adminId,
      action: 'report.review',
      targetType: 'report',
      targetId: id,
      oldValue: { status: report.status },
      newValue: { status: body.status, action: body.action ?? null },
      reason: body.reason,
      req,
    });

    return ok(res, { reviewed: true, status: body.status });
  }),
);

adminRouter.get(
  '/report-reasons',
  requirePermission('moderation.reports'),
  asyncHandler(async (_req, res) => {
    const reasons = await prisma.reportReason.findMany({ orderBy: { labelAr: 'asc' } });
    return ok(res, { reasons });
  }),
);

// ═══════════════════════ المحتوى ═══════════════════════

adminRouter.get(
  '/articles',
  requirePermission('content.manage_blog'),
  asyncHandler(async (req, res) => {
    const query = validate(
      z.object({
        status: z.nativeEnum(ArticleStatus).optional(),
        q: z.string().trim().max(100).optional(),
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(25),
      }),
      req.query,
    );
    const where: Prisma.BlogArticleWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.q ? { title: { contains: query.q, mode: 'insensitive' } } : {}),
    };
    const [rows, total] = await Promise.all([
      prisma.blogArticle.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: { category: true },
      }),
      prisma.blogArticle.count({ where }),
    ]);
    return ok(res, { results: rows, total, page: query.page, pages: Math.max(1, Math.ceil(total / query.limit)) });
  }),
);

adminRouter.post(
  '/articles',
  requirePermission('content.manage_blog'),
  asyncHandler(async (req, res) => {
    const body = validate(
      z.object({
        title: z.string().trim().min(3).max(200),
        slug: z.string().trim().regex(/^[a-z0-9-]+$/, 'slug بحروف إنجليزية وأرقام وشرطات'),
        excerpt: z.string().trim().max(500).optional(),
        body: z.string().trim().min(20),
        categoryId: z.string().optional(),
        coverUrl: z.string().url().optional(),
        status: z.nativeEnum(ArticleStatus).default('draft'),
        isFeatured: z.boolean().default(false),
      }),
      req.body,
    );

    const article = await prisma.blogArticle.create({
      data: {
        authorId: req.admin!.adminId,
        title: body.title,
        slug: body.slug,
        excerpt: body.excerpt ?? null,
        body: body.body,
        categoryId: body.categoryId ?? null,
        coverUrl: body.coverUrl ?? null,
        status: body.status,
        isFeatured: body.isFeatured,
        publishedAt: body.status === 'published' ? new Date() : null,
      },
    });
    await audit({ adminId: req.admin!.adminId, action: 'article.create', targetType: 'article', targetId: article.id, req });
    return ok(res, { article }, undefined, 201);
  }),
);

adminRouter.patch(
  '/articles/:id',
  requirePermission('content.manage_blog'),
  asyncHandler(async (req, res) => {
    const id = z.string().min(1).parse(req.params.id);
    const body = validate(
      z.object({
        title: z.string().trim().min(3).max(200).optional(),
        excerpt: z.string().trim().max(500).optional().nullable(),
        body: z.string().trim().min(20).optional(),
        categoryId: z.string().optional().nullable(),
        coverUrl: z.string().url().optional().nullable(),
        status: z.nativeEnum(ArticleStatus).optional(),
        isFeatured: z.boolean().optional(),
      }),
      req.body,
    );
    const existing = await prisma.blogArticle.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('المقال غير موجود');

    const article = await prisma.blogArticle.update({
      where: { id },
      data: {
        ...body,
        ...(body.status === 'published' && !existing.publishedAt ? { publishedAt: new Date() } : {}),
      },
    });
    await audit({
      adminId: req.admin!.adminId,
      action: 'article.update',
      targetType: 'article',
      targetId: id,
      oldValue: { status: existing.status, title: existing.title },
      newValue: { status: article.status, title: article.title },
      req,
    });
    return ok(res, { article });
  }),
);

adminRouter.get(
  '/posts',
  requirePermission('content.manage_community'),
  asyncHandler(async (req, res) => {
    const query = validate(
      z.object({
        status: z.nativeEnum(PostStatus).optional(),
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(25),
      }),
      req.query,
    );
    const where = query.status ? { status: query.status } : {};
    const [rows, total] = await Promise.all([
      prisma.post.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          author: { select: { id: true, firstName: true, lastName: true, phone: true } },
          topic: true,
        },
      }),
      prisma.post.count({ where }),
    ]);
    return ok(res, { results: rows, total, page: query.page, pages: Math.max(1, Math.ceil(total / query.limit)) });
  }),
);

adminRouter.patch(
  '/posts/:id',
  requirePermission('content.manage_community'),
  asyncHandler(async (req, res) => {
    const id = z.string().min(1).parse(req.params.id);
    const body = validate(z.object({ status: z.nativeEnum(PostStatus) }), req.body);
    const post = await prisma.post.update({
      where: { id },
      data: {
        status: body.status,
        ...(body.status === 'published' ? { publishedAt: new Date() } : {}),
      },
    });
    await audit({ adminId: req.admin!.adminId, action: 'post.moderate', targetType: 'post', targetId: id, newValue: body, req });
    return ok(res, { post });
  }),
);

adminRouter.get(
  '/topics',
  requirePermission('content.manage_community'),
  asyncHandler(async (_req, res) => {
    const topics = await prisma.communityTopic.findMany({ orderBy: [{ sortOrder: 'asc' }, { nameAr: 'asc' }] });
    return ok(res, { topics });
  }),
);

adminRouter.post(
  '/topics',
  requirePermission('content.manage_community'),
  asyncHandler(async (req, res) => {
    const body = validate(
      z.object({
        key: z.string().trim().regex(/^[a-z0-9_]+$/),
        nameAr: z.string().trim().min(2).max(80),
        icon: z.string().trim().max(40).optional(),
        isFollowable: z.boolean().default(true),
        isSeasonal: z.boolean().default(false),
      }),
      req.body,
    );
    const topic = await prisma.communityTopic.create({ data: body });
    await audit({ adminId: req.admin!.adminId, action: 'topic.create', targetType: 'topic', targetId: topic.id, req });
    return ok(res, { topic }, undefined, 201);
  }),
);

// ═══════════════════════ الباقات والمال ═══════════════════════

adminRouter.get(
  '/plans',
  requirePermission('finance.manage_packages'),
  asyncHandler(async (_req, res) => {
    const plans = await prisma.subscriptionPlan.findMany({
      orderBy: [{ sortOrder: 'asc' }, { priceAmount: 'asc' }],
      include: { features: { include: { feature: true } } },
    });
    return ok(res, { plans });
  }),
);

adminRouter.patch(
  '/plans/:id',
  requirePermission('finance.manage_packages'),
  asyncHandler(async (req, res) => {
    const id = z.string().min(1).parse(req.params.id);
    const body = validate(
      z.object({
        name: z.string().trim().min(2).max(80).optional(),
        priceAmount: z.number().int().min(0).max(100000).optional(),
        descriptionAr: z.string().trim().max(500).optional().nullable(),
        isActive: z.boolean().optional(),
        autoRenewDefault: z.boolean().optional(),
        sortOrder: z.number().int().min(0).max(1000).optional(),
      }),
      req.body,
    );
    const existing = await prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('الباقة غير موجودة');
    const plan = await prisma.subscriptionPlan.update({ where: { id }, data: body });
    await audit({
      adminId: req.admin!.adminId,
      action: 'plan.update',
      targetType: 'plan',
      targetId: id,
      oldValue: existing,
      newValue: plan,
      req,
    });
    return ok(res, { plan });
  }),
);

adminRouter.get(
  '/packages',
  requirePermission('finance.manage_packages'),
  asyncHandler(async (_req, res) => {
    const packages = await prisma.creditPackage.findMany({ orderBy: [{ sortOrder: 'asc' }, { priceAmount: 'asc' }] });
    return ok(res, { packages });
  }),
);

adminRouter.patch(
  '/packages/:id',
  requirePermission('finance.manage_packages'),
  asyncHandler(async (req, res) => {
    const id = z.string().min(1).parse(req.params.id);
    const body = validate(
      z.object({
        name: z.string().trim().min(2).max(80).optional(),
        baseCredits: z.number().int().min(0).max(1000000).optional(),
        bonusCredits: z.number().int().min(0).max(1000000).optional(),
        priceAmount: z.number().int().min(0).max(1000000).optional(),
        isActive: z.boolean().optional(),
        isPopular: z.boolean().optional(),
        sortOrder: z.number().int().min(0).max(1000).optional(),
      }),
      req.body,
    );
    const existing = await prisma.creditPackage.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('الباقة غير موجودة');
    const pack = await prisma.creditPackage.update({ where: { id }, data: body });
    await audit({
      adminId: req.admin!.adminId,
      action: 'package.update',
      targetType: 'package',
      targetId: id,
      oldValue: existing,
      newValue: pack,
      req,
    });
    return ok(res, { package: pack });
  }),
);

adminRouter.get(
  '/payments',
  requirePermission('finance.view_transactions'),
  asyncHandler(async (req, res) => {
    const query = validate(
      z.object({
        status: z.enum(['pending', 'succeeded', 'failed', 'refunded_never']).optional(),
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(25),
      }),
      req.query,
    );
    const where = query.status ? { status: query.status as never } : {};
    const [rows, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: { user: { select: { id: true, firstName: true, lastName: true, phone: true } } },
      }),
      prisma.payment.count({ where }),
    ]);
    return ok(res, { results: rows, total, page: query.page, pages: Math.max(1, Math.ceil(total / query.limit)) });
  }),
);

adminRouter.post(
  '/payments/:id/mark-paid',
  requirePermission('finance.manage_packages'),
  asyncHandler(async (req, res) => {
    const id = z.string().min(1).parse(req.params.id);
    const body = validate(z.object({ note: z.string().trim().max(500).optional() }), req.body);
    const payment = await prisma.payment.findUnique({ where: { id } });
    if (!payment) throw ApiError.notFound('الدفعة غير موجودة');
    if (payment.status === 'succeeded') return ok(res, { paid: true, already: true });

    const paid = await fulfillPayment(payment.id, `manual-${req.admin!.adminId}`);
    await audit({
      adminId: req.admin!.adminId,
      action: 'payment.mark_paid',
      targetType: 'payment',
      targetId: id,
      newValue: { status: paid.status, note: body.note ?? null },
      req,
    });
    return ok(res, { paid: true, payment: paid });
  }),
);

adminRouter.get(
  '/subscriptions',
  requirePermission('finance.view_transactions'),
  asyncHandler(async (req, res) => {
    const query = validate(
      z.object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(25),
      }),
      req.query,
    );
    const [rows, total] = await Promise.all([
      prisma.subscription.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          plan: { select: { name: true, key: true } },
          user: { select: { id: true, firstName: true, lastName: true, phone: true } },
        },
      }),
      prisma.subscription.count(),
    ]);
    return ok(res, { results: rows, total, page: query.page, pages: Math.max(1, Math.ceil(total / query.limit)) });
  }),
);

// ═══════════════════════ الإعدادات والأمان ═══════════════════════

adminRouter.get(
  '/settings',
  requirePermission('system.manage_settings'),
  asyncHandler(async (_req, res) => {
    const [settings, flags] = await Promise.all([
      prisma.appSetting.findMany({ orderBy: [{ group: 'asc' }, { key: 'asc' }] }),
      prisma.featureFlag.findMany({ orderBy: { key: 'asc' } }),
    ]);
    return ok(res, { settings, flags });
  }),
);

adminRouter.patch(
  '/settings/:key',
  requirePermission('system.manage_settings'),
  asyncHandler(async (req, res) => {
    const key = z.string().min(1).max(120).parse(req.params.key);
    const body = validate(
      z.object({
        value: z.unknown(),
        group: z.string().trim().max(60).optional(),
      }),
      req.body,
    );
    const existing = await prisma.appSetting.findUnique({ where: { key } });
    const setting = await prisma.appSetting.upsert({
      where: { key },
      create: { key, value: body.value as Prisma.InputJsonValue, group: body.group ?? 'general', updatedBy: req.admin!.adminId },
      update: { value: body.value as Prisma.InputJsonValue, updatedBy: req.admin!.adminId },
    });
    await audit({
      adminId: req.admin!.adminId,
      action: 'setting.update',
      targetType: 'setting',
      targetId: key,
      oldValue: existing?.value,
      newValue: body.value,
      req,
    });
    return ok(res, { setting });
  }),
);

adminRouter.patch(
  '/feature-flags/:key',
  requirePermission('system.manage_settings'),
  asyncHandler(async (req, res) => {
    const key = z.string().min(1).max(120).parse(req.params.key);
    const body = validate(
      z.object({
        isEnabled: z.boolean().optional(),
        rollout: z.number().int().min(0).max(100).optional(),
        nameAr: z.string().trim().max(120).optional(),
        description: z.string().trim().max(500).optional(),
      }),
      req.body,
    );
    const existing = await prisma.featureFlag.findUnique({ where: { key } });
    const flag = await prisma.featureFlag.upsert({
      where: { key },
      create: { key, ...body, updatedBy: req.admin!.adminId },
      update: { ...body, updatedBy: req.admin!.adminId },
    });
    await audit({
      adminId: req.admin!.adminId,
      action: 'feature_flag.update',
      targetType: 'feature_flag',
      targetId: key,
      oldValue: existing,
      newValue: flag,
      req,
    });
    return ok(res, { flag });
  }),
);

adminRouter.get(
  '/audit',
  requirePermission('system.view_audit_logs'),
  asyncHandler(async (req, res) => {
    const query = validate(
      z.object({
        action: z.string().trim().max(80).optional(),
        targetType: z.string().trim().max(40).optional(),
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(50),
      }),
      req.query,
    );
    const where: Prisma.AuditLogWhereInput = {
      ...(query.action ? { action: { contains: query.action } } : {}),
      ...(query.targetType ? { targetType: query.targetType } : {}),
    };
    const [rows, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: { actorAdmin: { select: { id: true, name: true, email: true } } },
      }),
      prisma.auditLog.count({ where }),
    ]);
    return ok(res, { results: rows, total, page: query.page, pages: Math.max(1, Math.ceil(total / query.limit)) });
  }),
);

adminRouter.get(
  '/admins',
  requirePermission('system.manage_admins'),
  asyncHandler(async (_req, res) => {
    const admins = await prisma.admin.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        twoFactorEnabled: true,
        lastLoginAt: true,
        createdAt: true,
        roles: { include: { role: { select: { id: true, key: true, nameAr: true } } } },
      },
    });
    return ok(res, { admins });
  }),
);

adminRouter.post(
  '/admins',
  requirePermission('system.manage_admins'),
  asyncHandler(async (req, res) => {
    const body = validate(
      z.object({
        name: z.string().trim().min(2).max(80),
        email: z.string().trim().email().transform((value) => value.toLowerCase()),
        phone: z.string().trim().max(20).optional(),
        password: passwordSchema,
        roleKey: z.string().trim().min(1),
      }),
      req.body,
    );
    const role = await prisma.adminRole.findUnique({ where: { key: body.roleKey } });
    if (!role) throw ApiError.notFound('الدور غير موجود');

    const admin = await prisma.admin.create({
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone ?? null,
        passwordHash: bcrypt.hashSync(body.password, 12),
        roles: { create: { roleId: role.id, assignedBy: req.admin!.adminId } },
      },
      select: { id: true, name: true, email: true, status: true, createdAt: true },
    });
    await audit({ adminId: req.admin!.adminId, action: 'admin.create', targetType: 'admin', targetId: admin.id, req });
    return ok(res, { admin }, undefined, 201);
  }),
);

adminRouter.patch(
  '/admins/:id',
  requirePermission('system.manage_admins'),
  asyncHandler(async (req, res) => {
    const id = z.string().min(1).parse(req.params.id);
    const body = validate(
      z.object({
        status: z.nativeEnum(AdminStatus).optional(),
        name: z.string().trim().min(2).max(80).optional(),
        phone: z.string().trim().max(20).optional().nullable(),
        roleKey: z.string().trim().optional(),
      }),
      req.body,
    );
    const existing = await prisma.admin.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('الحساب الإداري غير موجود');
    if (id === req.admin!.adminId && body.status && body.status !== 'active') {
      throw ApiError.badRequest('لا يمكنك تعطيل حسابك الحالي');
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (body.roleKey) {
        const role = await tx.adminRole.findUnique({ where: { key: body.roleKey } });
        if (!role) throw ApiError.notFound('الدور غير موجود');
        await tx.adminUserRole.deleteMany({ where: { adminId: id } });
        await tx.adminUserRole.create({ data: { adminId: id, roleId: role.id, assignedBy: req.admin!.adminId } });
      }
      return tx.admin.update({
        where: { id },
        data: {
          ...(body.status ? { status: body.status } : {}),
          ...(body.name ? { name: body.name } : {}),
          ...(body.phone !== undefined ? { phone: body.phone } : {}),
        },
        select: { id: true, name: true, email: true, status: true, roles: { include: { role: true } } },
      });
    });

    if (body.status && body.status !== 'active') {
      await revokeAdminSessions(id);
    }

    await audit({
      adminId: req.admin!.adminId,
      action: 'admin.update',
      targetType: 'admin',
      targetId: id,
      oldValue: existing,
      newValue: updated,
      req,
    });
    return ok(res, { admin: updated });
  }),
);

adminRouter.post(
  '/admins/:id/2fa/reset',
  requirePermission('system.manage_admins'),
  asyncHandler(async (req, res) => {
    const id = z.string().min(1).parse(req.params.id);
    if (id === req.admin!.adminId) {
      throw ApiError.badRequest(
        'استخدم شاشة «أمان الحساب» لإيقاف التحقق بخطوتين على حسابك الحالي',
      );
    }
    const existing = await prisma.admin.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('الحساب الإداري غير موجود');

    await prisma.admin.update({
      where: { id },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });
    const revoked = await revokeAdminSessions(id);
    await audit({
      adminId: req.admin!.adminId,
      action: 'admin.2fa_reset',
      targetType: 'admin',
      targetId: id,
      reason: 'super_admin_reset',
      req,
    });

    return ok(res, {
      reset: true,
      otherSessionsRevoked: revoked,
    });
  }),
);

adminRouter.get(
  '/roles',
  requirePermission('system.manage_roles'),
  asyncHandler(async (_req, res) => {
    const roles = await prisma.adminRole.findMany({
      orderBy: { nameAr: 'asc' },
      include: { rolePermissions: { include: { permission: true } } },
    });
    return ok(res, { roles });
  }),
);

// ═══════════════════════ التحليلات والإشعارات ═══════════════════════

adminRouter.get(
  '/analytics',
  requirePermission('analytics.view'),
  asyncHandler(async (_req, res) => {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [signups, matches, messages, revenue, verificationFunnel, topInterests] = await Promise.all([
      prisma.$queryRaw<Array<{ day: string; count: number }>>`
        SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day, count(*)::int AS count
        FROM users WHERE created_at >= ${since} AND deleted_at IS NULL
        GROUP BY 1 ORDER BY 1
      `,
      prisma.$queryRaw<Array<{ day: string; count: number }>>`
        SELECT to_char(date_trunc('day', matched_at), 'YYYY-MM-DD') AS day, count(*)::int AS count
        FROM matches WHERE matched_at >= ${since} AND status = 'active'
        GROUP BY 1 ORDER BY 1
      `,
      prisma.$queryRaw<Array<{ day: string; count: number }>>`
        SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day, count(*)::int AS count
        FROM messages WHERE created_at >= ${since} AND deleted_at IS NULL
        GROUP BY 1 ORDER BY 1
      `,
      prisma.$queryRaw<Array<{ day: string; amount: number }>>`
        SELECT to_char(date_trunc('day', paid_at), 'YYYY-MM-DD') AS day, coalesce(sum(amount), 0)::int AS amount
        FROM payments WHERE status = 'succeeded' AND paid_at >= ${since}
        GROUP BY 1 ORDER BY 1
      `,
      prisma.user.groupBy({
        by: ['verification'],
        _count: { _all: true },
        where: { deletedAt: null },
      }),
      prisma.profileAbout.findMany({
        select: { interests: true },
        take: 500,
      }),
    ]);

    const counts = new Map<string, number>();
    for (const row of topInterests) {
      for (const interest of row.interests) counts.set(interest, (counts.get(interest) ?? 0) + 1);
    }

    return ok(res, {
      signups,
      matches,
      messages,
      revenue,
      verificationFunnel: verificationFunnel.map((row) => ({ status: row.verification, count: row._count._all })),
      topInterests: Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => ({ name, count })),
    });
  }),
);

adminRouter.post(
  '/notifications/broadcast',
  requirePermission('support.handle_users'),
  asyncHandler(async (req, res) => {
    const body = validate(
      z.object({
        title: z.string().trim().min(2).max(120),
        message: z.string().trim().min(2).max(1000),
        audience: z.enum(['all', 'active', 'verified']).default('active'),
        channel: z.nativeEnum(NotificationChannel).default('push'),
      }),
      req.body,
    );

    const where: Prisma.UserWhereInput =
      body.audience === 'verified'
        ? { verification: 'verified', accountStatus: 'active', deletedAt: null }
        : body.audience === 'active'
          ? { accountStatus: 'active', deletedAt: null, lastActiveAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }
          : { accountStatus: 'active', deletedAt: null };

    const users = await prisma.user.findMany({ where, select: { id: true }, take: 5000 });
    await prisma.notification.createMany({
      data: users.map((user) => ({
        userId: user.id,
        type: 'broadcast',
        titleAr: body.title,
        bodyAr: body.message,
        channel: body.channel,
      })),
    });

    await audit({
      adminId: req.admin!.adminId,
      action: 'notification.broadcast',
      targetType: 'notification',
      newValue: { title: body.title, audience: body.audience, recipients: users.length },
      req,
    });

    return ok(res, { sent: users.length });
  }),
);
