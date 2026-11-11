import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { config } from '../config';
import { prisma } from '../db';
import { asyncHandler, ok } from '../http/envelope';
import { ApiError } from '../http/errors';
import { validate } from '../http/validate';
import { profileCompletion } from '../profile/completion';
import { assertLoginAllowed, persistentRateLimit } from '../security/rateLimit';
import { consumeOtp, startOtp } from './otp';
import {
  egyptianPhone,
  isEmail,
  normalizeEgyptianPhone,
  otpCode,
  phoneOrEmail,
} from './phone';
import { verifyGoogleAccessToken } from './google';
import {
  createTwoFactorChallenge,
  readTwoFactorChallenge,
  twoFactorChallengeTtlSeconds,
} from './twoFactor';
import {
  createWebSession,
  destroyWebSession,
  readWebSession,
  requireAuth,
  revokeUserSessions,
  rotateWebSession,
} from './session';
import { publicUserSelect, toPublicUser } from './user';
import { transactionReference, welcomeBonusAmount } from './welcome';

export const authRouter = Router();

const passwordSchema = z.string().min(8, 'كلمة المرور ٨ أحرف على الأقل').max(128);
const nameSchema = z.string().trim().max(60);

const otpLimiter = persistentRateLimit({
  name: 'auth:otp',
  limit: 30,
  windowSeconds: 10 * 60,
  message: 'محاولات كثيرة — حاول بعد قليل',
});

const loginLimiter = persistentRateLimit({
  name: 'auth:login',
  limit: 20,
  windowSeconds: 15 * 60,
  message: 'محاولات دخول كثيرة — حاول بعد قليل',
});

const resetLimiter = persistentRateLimit({
  name: 'auth:reset',
  limit: 10,
  windowSeconds: 15 * 60,
  message: 'محاولات كثيرة — حاول بعد ربع ساعة',
});

const accountLimiter = persistentRateLimit({
  name: 'auth:account',
  limit: 40,
  windowSeconds: 60 * 60,
  key: (req) => req.auth?.userId ?? req.ip,
  message: 'محاولات كثيرة على الحساب — حاول بعد قليل',
});

function assertAccountActive(status: string): void {
  if (status !== 'active') throw new ApiError('ACCOUNT_SUSPENDED');
}

type TwoFactorUser = {
  id: string;
  phone: string;
  phoneVerifiedAt: Date | null;
  notificationSettings: { twoFactorEnabled: boolean } | null;
};

/**
 * لا تُنشأ جلسة قبل إتمام الخطوة الثانية. التحدي موقّع ومربوط بالحساب،
 * والكود يُرسل إلى الهاتف الموثّق فقط.
 */
async function startTwoFactorChallenge(user: TwoFactorUser) {
  if (!user.notificationSettings?.twoFactorEnabled) return null;

  const phone = normalizeEgyptianPhone(user.phone);
  if (!phone || !user.phoneVerifiedAt) {
    throw ApiError.forbidden(
      'التحقق بخطوتين مفعّل لكن رقم الهاتف غير موثّق — حدّث رقمك أو تواصل مع الدعم',
    );
  }

  const started = await startOtp(phone, 'two_factor', { userId: user.id });

  return {
    twoFactorRequired: true as const,
    challenge: createTwoFactorChallenge(user.id),
    phoneHint: `${phone.slice(0, 3)}****${phone.slice(-3)}`,
    expiresInSeconds: Math.min(
      started.expiresInSeconds,
      twoFactorChallengeTtlSeconds(),
    ),
    resendAfterSeconds: started.resendAfterSeconds,
    ...(config.otp.devEcho ? { devCode: started.code } : {}),
  };
}

async function loadTwoFactorUser(challenge: string) {
  const userId = readTwoFactorChallenge(challenge);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      ...publicUserSelect,
      notificationSettings: { select: { twoFactorEnabled: true } },
    },
  });
  if (!user) throw ApiError.unauthorized('تحدي التحقق غير صالح');
  assertAccountActive(user.accountStatus);
  return user;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2002'
  );
}

function calcAge(dob: Date): number {
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const month = now.getMonth() - dob.getMonth();
  if (month < 0 || (month === 0 && now.getDate() < dob.getDate())) age -= 1;
  return age;
}

async function logLoginAttempt(input: {
  userId?: string;
  phone?: string;
  email?: string;
  success: boolean;
  reason?: string;
  ipAddress?: string;
}): Promise<void> {
  await prisma.loginAttempt
    .create({
      data: {
        userId: input.userId ?? null,
        phone: input.phone ?? null,
        email: input.email ?? null,
        success: input.success,
        reason: input.reason ?? null,
        ipAddress: input.ipAddress ?? null,
        deviceId: 'web',
      },
    })
    .catch(() => undefined);
}

async function notifyUser(userId: string, type: string, titleAr: string, bodyAr: string): Promise<void> {
  await prisma.notification
    .create({ data: { userId, type, titleAr, bodyAr } })
    .catch(() => undefined);
}

// ═══════════════════════ التسجيل ═══════════════════════

authRouter.post(
  '/register/start',
  otpLimiter,
  asyncHandler(async (req, res) => {
    const body = validate(z.object({ phone: egyptianPhone }), req.body);

    const existing = await prisma.user.findUnique({ where: { phone: body.phone } });
    if (existing) {
      assertAccountActive(existing.accountStatus);
      throw ApiError.conflict('هذا الرقم مسجّل بالفعل — سجّل الدخول بدل ذلك');
    }

    const started = await startOtp(body.phone, 'register');
    return ok(
      res,
      {
        phone: body.phone,
        codeLength: 5,
        expiresInSeconds: started.expiresInSeconds,
        resendAfterSeconds: started.resendAfterSeconds,
        ...(config.otp.devEcho ? { devCode: started.code } : {}),
      },
      { next: 'POST /api/auth/register/verify-otp' },
    );
  }),
);

authRouter.post(
  '/register/verify-otp',
  otpLimiter,
  asyncHandler(async (req, res) => {
    const body = validate(
      z.object({
        phone: egyptianPhone,
        code: otpCode,
        firstName: nameSchema.optional(),
        lastName: nameSchema.optional(),
        password: passwordSchema.optional(),
        rememberMe: z.boolean().default(false),
      }),
      req.body,
    );

    await consumeOtp(body.phone, 'register', body.code);

    const existing = await prisma.user.findUnique({
      where: { phone: body.phone },
      select: publicUserSelect,
    });

    let user;
    let created = false;

    if (existing) {
      assertAccountActive(existing.accountStatus);
      const data: {
        phoneVerifiedAt: Date;
        firstName?: string;
        lastName?: string;
        passwordHash?: string;
      } = { phoneVerifiedAt: new Date() };
      if (body.firstName && !existing.firstName) data.firstName = body.firstName;
      if (body.lastName && !existing.lastName) data.lastName = body.lastName;
      if (body.password && !existing.passwordHash) data.passwordHash = bcrypt.hashSync(body.password, 12);

      user = await prisma.user.update({
        where: { id: existing.id },
        data,
        select: publicUserSelect,
      });
    } else {
      const bonus = await welcomeBonusAmount();

      user = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            phone: body.phone,
            firstName: body.firstName ?? '',
            lastName: body.lastName,
            passwordHash: body.password ? bcrypt.hashSync(body.password, 12) : null,
            phoneVerifiedAt: new Date(),
            wallet: { create: { balanceCredits: bonus, currency: 'EGP' } },
            privacy: { create: {} },
            notificationSettings: { create: {} },
            profile: { create: {} },
          },
          select: publicUserSelect,
        });

        if (bonus > 0) {
          await tx.creditTransaction.create({
            data: {
              reference: transactionReference(),
              userId: newUser.id,
              type: 'welcome_bonus',
              amount: bonus,
              balanceBefore: 0,
              balanceAfter: bonus,
              description: 'هدية ترحيبية',
            },
          });
        }

        return newUser;
      });
      created = true;
    }

    const session = await createWebSession(user.id, req, res, { rememberMe: body.rememberMe });
    await prisma.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } });
    await logLoginAttempt({ userId: user.id, phone: user.phone, success: true, reason: 'register', ipAddress: req.ip });

    const completion = await profileCompletion(user.id, user);

    return ok(
      res,
      {
        user: toPublicUser(user),
        created,
        profileCompletion: completion,
        session: { expiresAt: session.expiresAt.toISOString() },
        next: 'PATCH /api/profile/basics',
      },
      undefined,
      created ? 201 : 200,
    );
  }),
);

authRouter.patch(
  '/register/profile-basics',
  requireAuth,
  accountLimiter,
  asyncHandler(async (req, res) => {
    const body = validate(
      z
        .object({
          firstName: z.string().trim().min(2, 'الاسم قصير').max(60).optional(),
          lastName: nameSchema.optional(),
          gender: z.enum(['male', 'female']).optional(),
          dateOfBirth: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, 'التاريخ بصيغة YYYY-MM-DD')
            .optional(),
          country: z.string().length(2).optional(),
          city: z.string().trim().min(2, 'المدينة مطلوبة').max(60).optional(),
        })
        .refine((value) => Object.keys(value).length > 0, 'أرسل بيانات للتحديث'),
      req.body,
    );

    let age: number | undefined;
    if (body.dateOfBirth) {
      const dob = new Date(body.dateOfBirth);
      if (Number.isNaN(dob.getTime())) throw ApiError.validation({ field: 'dateOfBirth' }, 'تاريخ غير صالح');
      age = calcAge(dob);
      if (age < 18) throw ApiError.validation({ age }, 'العمر أقل من ١٨ سنة');
      if (age > 80) throw ApiError.validation({ age }, 'العمر غير منطقي');
    }

    const updated = await prisma.user.update({
      where: { id: req.auth!.userId },
      data: {
        ...(body.firstName ? { firstName: body.firstName } : {}),
        ...(body.lastName !== undefined ? { lastName: body.lastName } : {}),
        ...(body.gender ? { gender: body.gender } : {}),
        ...(body.dateOfBirth ? { dateOfBirth: new Date(body.dateOfBirth) } : {}),
        ...(body.country ? { country: body.country } : {}),
        ...(body.city ? { city: body.city } : {}),
      },
      select: publicUserSelect,
    });

    const completion = await profileCompletion(updated.id, updated);

    return ok(res, {
      user: toPublicUser(updated),
      age,
      profileCompletion: completion,
      next: 'PATCH /api/profile/marriage',
    });
  }),
);

// ═══════════════════════ الدخول بـ OTP ═══════════════════════

authRouter.post(
  '/otp/login/start',
  otpLimiter,
  asyncHandler(async (req, res) => {
    const body = validate(z.object({ phone: egyptianPhone }), req.body);

    const user = await prisma.user.findUnique({ where: { phone: body.phone } });
    if (!user) throw ApiError.notFound('لا يوجد حساب بهذا الرقم');
    assertAccountActive(user.accountStatus);

    const started = await startOtp(body.phone, 'login');
    return ok(
      res,
      {
        phone: body.phone,
        codeLength: 5,
        expiresInSeconds: started.expiresInSeconds,
        resendAfterSeconds: started.resendAfterSeconds,
        ...(config.otp.devEcho ? { devCode: started.code } : {}),
      },
      { next: 'POST /api/auth/otp/login/verify' },
    );
  }),
);

authRouter.post(
  '/otp/login/verify',
  otpLimiter,
  asyncHandler(async (req, res) => {
    const body = validate(
      z.object({
        phone: egyptianPhone,
        code: otpCode,
        rememberMe: z.boolean().default(false),
      }),
      req.body,
    );

    await consumeOtp(body.phone, 'login', body.code);

    const user = await prisma.user.findUnique({
      where: { phone: body.phone },
      select: publicUserSelect,
    });
    if (!user) throw ApiError.notFound('لا يوجد حساب بهذا الرقم');
    assertAccountActive(user.accountStatus);

    const session = await createWebSession(user.id, req, res, { rememberMe: body.rememberMe });
    await prisma.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } });
    await logLoginAttempt({ userId: user.id, phone: user.phone, success: true, reason: 'otp', ipAddress: req.ip });

    return ok(res, {
      user: toPublicUser(user),
      session: { expiresAt: session.expiresAt.toISOString() },
      profileCompletion: await profileCompletion(user.id, user),
    });
  }),
);

// ═══════════════════════ الدخول بكلمة المرور ═══════════════════════

authRouter.post(
  '/login',
  loginLimiter,
  asyncHandler(async (req, res) => {
    const body = validate(
      z.object({
        identifier: phoneOrEmail,
        password: z.string().min(1, 'كلمة المرور مطلوبة').max(128),
        rememberMe: z.boolean().default(false),
      }),
      req.body,
    );

    const byEmail = isEmail(body.identifier);
    await assertLoginAllowed({
      phone: byEmail ? undefined : body.identifier,
      email: byEmail ? body.identifier : undefined,
      ip: req.ip,
    });

    const user = await prisma.user.findFirst({
      where: byEmail ? { email: body.identifier } : { phone: body.identifier },
      select: {
        ...publicUserSelect,
        notificationSettings: { select: { twoFactorEnabled: true } },
      },
    });

    if (!user?.passwordHash || !bcrypt.compareSync(body.password, user.passwordHash)) {
      await logLoginAttempt({
        userId: user?.id,
        phone: byEmail ? undefined : body.identifier,
        email: byEmail ? body.identifier : undefined,
        success: false,
        reason: 'bad_credentials',
        ipAddress: req.ip,
      });
      throw ApiError.unauthorized('بيانات الدخول غير صحيحة');
    }

    assertAccountActive(user.accountStatus);

    const twoFactor = await startTwoFactorChallenge(user);
    if (twoFactor) {
      await logLoginAttempt({
        userId: user.id,
        phone: byEmail ? undefined : body.identifier,
        email: byEmail ? body.identifier : undefined,
        success: true,
        reason: 'password_2fa_challenge',
        ipAddress: req.ip,
      });
      return ok(res, twoFactor, { next: 'POST /api/auth/login/2fa/verify' });
    }

    const session = await createWebSession(user.id, req, res, { rememberMe: body.rememberMe });
    await prisma.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } });
    await logLoginAttempt({
      userId: user.id,
      phone: byEmail ? undefined : body.identifier,
      email: byEmail ? body.identifier : undefined,
      success: true,
      ipAddress: req.ip,
    });

    return ok(res, {
      user: toPublicUser(user),
      rememberMe: body.rememberMe,
      session: { expiresAt: session.expiresAt.toISOString() },
      profileCompletion: await profileCompletion(user.id, user),
    });
  }),
);

// ═══════════════════════ الخطوة الثانية بعد كلمة المرور ═══════════════════════

authRouter.post(
  '/login/2fa/verify',
  otpLimiter,
  asyncHandler(async (req, res) => {
    const body = validate(
      z.object({
        challenge: z.string().min(20).max(2048),
        code: otpCode,
        rememberMe: z.boolean().default(false),
      }),
      req.body,
    );

    const user = await loadTwoFactorUser(body.challenge);
    if (!user.notificationSettings?.twoFactorEnabled) {
      throw ApiError.badRequest('التحقق بخطوتين غير مفعّل على هذا الحساب');
    }

    const phone = normalizeEgyptianPhone(user.phone);
    if (!phone) throw ApiError.unauthorized('تحدي التحقق غير صالح');

    await consumeOtp(phone, 'two_factor', body.code, { userId: user.id });

    const session = await createWebSession(user.id, req, res, {
      rememberMe: body.rememberMe,
    });
    await prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() },
    });
    await logLoginAttempt({
      userId: user.id,
      phone,
      success: true,
      reason: 'two_factor',
      ipAddress: req.ip,
    });

    return ok(res, {
      user: toPublicUser(user),
      rememberMe: body.rememberMe,
      session: { expiresAt: session.expiresAt.toISOString() },
      profileCompletion: await profileCompletion(user.id, user),
    });
  }),
);

authRouter.post(
  '/login/2fa/resend',
  otpLimiter,
  asyncHandler(async (req, res) => {
    const body = validate(
      z.object({ challenge: z.string().min(20).max(2048) }),
      req.body,
    );

    const user = await loadTwoFactorUser(body.challenge);
    if (!user.notificationSettings?.twoFactorEnabled) {
      throw ApiError.badRequest('التحقق بخطوتين غير مفعّل على هذا الحساب');
    }

    const phone = normalizeEgyptianPhone(user.phone);
    if (!phone || !user.phoneVerifiedAt) {
      throw ApiError.badRequest('رقم الهاتف غير موثّق');
    }

    const started = await startOtp(phone, 'two_factor', { userId: user.id });

    return ok(res, {
      phone,
      codeLength: 5,
      expiresInSeconds: started.expiresInSeconds,
      resendAfterSeconds: started.resendAfterSeconds,
      ...(config.otp.devEcho ? { devCode: started.code } : {}),
    });
  }),
);

// ═══════════════════════ الدخول عبر Google ═══════════════════════

authRouter.get('/google/config', (_req, res) => {
  return ok(res, {
    enabled: config.google.enabled,
    clientId: config.google.clientId,
  });
});

authRouter.post(
  '/google',
  loginLimiter,
  asyncHandler(async (req, res) => {
    const body = validate(
      z.object({
        accessToken: z.string().min(20, 'توكن جوجل مطلوب').max(4096),
        rememberMe: z.boolean().default(false),
      }),
      req.body,
    );

    const profile = await verifyGoogleAccessToken(body.accessToken);

    const linked = await prisma.socialAccount.findUnique({
      where: { provider_providerUid: { provider: 'google', providerUid: profile.sub } },
      include: { user: true },
    });

    let user = linked?.user ?? null;
    let created = false;

    if (!user) {
      if (profile.email) {
        user = await prisma.user.findUnique({ where: { email: profile.email } });
      }

      if (user) {
        assertAccountActive(user.accountStatus);
        await prisma.socialAccount
          .create({
            data: {
              userId: user.id,
              provider: 'google',
              providerUid: profile.sub,
              email: profile.email,
            },
          })
          .catch((error: unknown) => {
            if (!isUniqueViolation(error)) throw error;
          });

        if (!user.email || !user.emailVerifiedAt) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: {
              ...(user.email ? {} : { email: profile.email }),
              emailVerifiedAt: new Date(),
            },
          });
        }
      } else {
        const bonus = await welcomeBonusAmount();
        user = await prisma.$transaction(async (tx) => {
          const newUser = await tx.user.create({
            data: {
              phone: `google_${profile.sub}`.slice(0, 64),
              email: profile.email,
              firstName: profile.givenName || profile.name || 'مستخدم جوجل',
              lastName: profile.familyName ?? null,
              emailVerifiedAt: profile.email ? new Date() : null,
              wallet: { create: { balanceCredits: bonus, currency: 'EGP' } },
              privacy: { create: {} },
              notificationSettings: { create: {} },
              profile: { create: {} },
              socialAccounts: {
                create: {
                  provider: 'google',
                  providerUid: profile.sub,
                  email: profile.email,
                },
              },
            },
          });

          if (bonus > 0) {
            await tx.creditTransaction.create({
              data: {
                reference: transactionReference(),
                userId: newUser.id,
                type: 'welcome_bonus',
                amount: bonus,
                balanceBefore: 0,
                balanceAfter: bonus,
                description: 'هدية ترحيبية',
              },
            });
          }

          return newUser;
        });
        created = true;
      }
    }

    assertAccountActive(user.accountStatus);

    const publicUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        ...publicUserSelect,
        notificationSettings: { select: { twoFactorEnabled: true } },
      },
    });
    if (!publicUser) throw ApiError.notFound('المستخدم غير موجود');

    const twoFactor = await startTwoFactorChallenge(publicUser);
    if (twoFactor) {
      await logLoginAttempt({
        userId: publicUser.id,
        email: profile.email ?? undefined,
        success: true,
        reason: 'google_2fa_challenge',
        ipAddress: req.ip,
      });
      return ok(res, { ...twoFactor, created, provider: 'google' }, {
        next: 'POST /api/auth/login/2fa/verify',
      });
    }

    const session = await createWebSession(publicUser.id, req, res, { rememberMe: body.rememberMe });
    await prisma.user.update({
      where: { id: publicUser.id },
      data: { lastActiveAt: new Date() },
    });
    await logLoginAttempt({
      userId: publicUser.id,
      email: profile.email ?? undefined,
      success: true,
      reason: 'google',
      ipAddress: req.ip,
    });

    return ok(
      res,
      {
        user: toPublicUser(publicUser),
        created,
        provider: 'google',
        rememberMe: body.rememberMe,
        session: { expiresAt: session.expiresAt.toISOString() },
        profileCompletion: await profileCompletion(publicUser.id, publicUser),
      },
      undefined,
      created ? 201 : 200,
    );
  }),
);

// ═══════════════════════ الجلسة الحالية ═══════════════════════

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (_req, res) => {
    const user = res.locals.webUser as Parameters<typeof toPublicUser>[0];
    const session = res.locals.webSession as {
      id: string;
      createdAt: Date;
      lastSeenAt: Date;
      expiresAt: Date;
    };

    return ok(res, {
      user: toPublicUser(user),
      session: {
        id: session.id,
        createdAt: session.createdAt.toISOString(),
        lastSeenAt: session.lastSeenAt.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
      },
      profileCompletion: await profileCompletion(user.id, user),
    });
  }),
);

authRouter.post(
  '/logout',
  asyncHandler(async (req, res) => {
    await destroyWebSession(req, res);
    return ok(res, { loggedOut: true });
  }),
);

authRouter.post(
  '/logout-all',
  requireAuth,
  asyncHandler(async (req, res) => {
    const revoked = await revokeUserSessions(req.auth!.userId);
    await destroyWebSession(req, res);
    return ok(res, { loggedOut: true, revokedSessions: revoked });
  }),
);

// ═══════════════════════ الجلسات النشطة ═══════════════════════

authRouter.get(
  '/sessions',
  requireAuth,
  asyncHandler(async (req, res) => {
    const sessions = await prisma.webSession.findMany({
      where: { userId: req.auth!.userId, expiresAt: { gt: new Date() } },
      orderBy: { lastSeenAt: 'desc' },
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        createdAt: true,
        lastSeenAt: true,
        expiresAt: true,
      },
    });

    return ok(res, {
      sessions: sessions.map((session) => ({
        ...session,
        createdAt: session.createdAt.toISOString(),
        lastSeenAt: session.lastSeenAt.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
        current: session.id === req.auth!.sessionId,
      })),
    });
  }),
);

authRouter.delete(
  '/sessions/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = z.string().min(1).parse(req.params.id);
    const result = await prisma.webSession.deleteMany({
      where: { id, userId: req.auth!.userId },
    });
    if (result.count === 0) throw ApiError.notFound('الجلسة غير موجودة');
    return ok(res, { revoked: true });
  }),
);

authRouter.post(
  '/sessions/revoke-others',
  requireAuth,
  asyncHandler(async (req, res) => {
    const revoked = await revokeUserSessions(req.auth!.userId, req.auth!.sessionId);
    return ok(res, { revokedSessions: revoked });
  }),
);

// ═══════════════════════ كلمة المرور ═══════════════════════

authRouter.post(
  '/set-password',
  requireAuth,
  accountLimiter,
  asyncHandler(async (req, res) => {
    const body = validate(
      z.object({
        currentPassword: z.string().optional(),
        newPassword: passwordSchema,
      }),
      req.body,
    );

    const user = await prisma.user.findUnique({
      where: { id: req.auth!.userId },
      select: { id: true, passwordHash: true },
    });
    if (!user) throw ApiError.notFound('المستخدم غير موجود');

    if (user.passwordHash) {
      if (!body.currentPassword || !bcrypt.compareSync(body.currentPassword, user.passwordHash)) {
        throw ApiError.unauthorized('كلمة المرور الحالية غير صحيحة');
      }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: bcrypt.hashSync(body.newPassword, 12) },
    });

    await rotateWebSession(req, res, user.id);
    await notifyUser(user.id, 'security', 'تم تعيين كلمة المرور', 'تم تعيين كلمة مرور لحسابك وإلغاء الجلسات الأخرى.');
    await logLoginAttempt({ userId: user.id, success: true, reason: 'password_set', ipAddress: req.ip });

    return ok(res, { passwordSet: true, sessionsRevoked: true });
  }),
);

authRouter.post(
  '/change-password',
  requireAuth,
  accountLimiter,
  asyncHandler(async (req, res) => {
    const body = validate(
      z.object({
        currentPassword: z.string().min(1, 'كلمة المرور الحالية مطلوبة'),
        newPassword: passwordSchema,
      }),
      req.body,
    );

    const user = await prisma.user.findUnique({
      where: { id: req.auth!.userId },
      select: { id: true, passwordHash: true },
    });
    if (!user?.passwordHash) throw ApiError.badRequest('لا توجد كلمة مرور مسجّلة — استخدم تعيين كلمة المرور');
    if (!bcrypt.compareSync(body.currentPassword, user.passwordHash)) {
      throw ApiError.unauthorized('كلمة المرور الحالية غير صحيحة');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: bcrypt.hashSync(body.newPassword, 12) },
    });

    await rotateWebSession(req, res, user.id);
    await notifyUser(user.id, 'security', 'تم تغيير كلمة المرور', 'تم تغيير كلمة مرور حسابك وإلغاء الجلسات الأخرى.');
    await logLoginAttempt({ userId: user.id, success: true, reason: 'password_change', ipAddress: req.ip });

    return ok(res, { passwordChanged: true, sessionsRevoked: true });
  }),
);

// ═══════════════════════ استعادة كلمة المرور ═══════════════════════

authRouter.post(
  '/password/forgot/start',
  resetLimiter,
  asyncHandler(async (req, res) => {
    const body = validate(z.object({ identifier: phoneOrEmail }), req.body);

    const byEmail = isEmail(body.identifier);
    const user = await prisma.user.findFirst({
      where: byEmail ? { email: body.identifier } : { phone: body.identifier },
      select: { id: true, phone: true, accountStatus: true },
    });

    // رد عام دائمًا حتى لا نكشف وجود الحساب.
    if (!user || user.accountStatus !== 'active' || user.phone.startsWith('google_')) {
      return ok(res, {
        sent: true,
        message: 'لو البيانات مسجّلة عندنا، هتوصلك رسالة بكود الاستعادة.',
      });
    }

    const started = await startOtp(user.phone, 'reset', { userId: user.id });

    return ok(
      res,
      {
        sent: true,
        phoneHint: `${user.phone.slice(0, 3)}****${user.phone.slice(-3)}`,
        expiresInSeconds: started.expiresInSeconds,
        resendAfterSeconds: started.resendAfterSeconds,
        ...(config.otp.devEcho ? { devCode: started.code } : {}),
        message: 'لو البيانات مسجّلة عندنا، هتوصلك رسالة بكود الاستعادة.',
      },
      { next: 'POST /api/auth/password/forgot/verify' },
    );
  }),
);

authRouter.post(
  '/password/forgot/verify',
  resetLimiter,
  asyncHandler(async (req, res) => {
    const body = validate(
      z
        .object({
          identifier: phoneOrEmail.optional(),
          phone: egyptianPhone.optional(),
          code: otpCode,
          newPassword: passwordSchema,
        })
        .refine((value) => Boolean(value.identifier || value.phone), {
          message: 'أرسل رقم الهاتف أو البريد الإلكتروني',
          path: ['identifier'],
        }),
      req.body,
    );

    const identifier = body.identifier ?? body.phone!;
    const byEmail = isEmail(identifier);
    const user = await prisma.user.findFirst({
      where: byEmail ? { email: identifier } : { phone: identifier },
      select: { id: true, phone: true, accountStatus: true },
    });
    if (!user) throw ApiError.badRequest('بيانات الاستعادة غير صحيحة');
    assertAccountActive(user.accountStatus);

    await consumeOtp(user.phone, 'reset', body.code, { userId: user.id });

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: bcrypt.hashSync(body.newPassword, 12) },
    });

    const revoked = await revokeUserSessions(user.id);
    await notifyUser(user.id, 'security', 'تم استعادة كلمة المرور', 'تم تعيين كلمة مرور جديدة وإلغاء كل الجلسات السابقة.');
    await logLoginAttempt({ userId: user.id, phone: user.phone, success: true, reason: 'password_reset', ipAddress: req.ip });

    return ok(res, { passwordReset: true, revokedSessions: revoked });
  }),
);

// ═══════════════════════ تغيير رقم الهاتف ═══════════════════════

authRouter.post(
  '/phone/change/start',
  requireAuth,
  accountLimiter,
  asyncHandler(async (req, res) => {
    const body = validate(z.object({ phone: egyptianPhone }), req.body);

    const existing = await prisma.user.findUnique({ where: { phone: body.phone }, select: { id: true } });
    if (existing && existing.id !== req.auth!.userId) {
      throw ApiError.conflict('هذا الرقم مستخدم في حساب آخر');
    }

    const started = await startOtp(body.phone, 'change_phone', { userId: req.auth!.userId });
    return ok(
      res,
      {
        phone: body.phone,
        codeLength: 5,
        expiresInSeconds: started.expiresInSeconds,
        resendAfterSeconds: started.resendAfterSeconds,
        ...(config.otp.devEcho ? { devCode: started.code } : {}),
      },
      { next: 'POST /api/auth/phone/change/verify' },
    );
  }),
);

authRouter.post(
  '/phone/change/verify',
  requireAuth,
  accountLimiter,
  asyncHandler(async (req, res) => {
    const body = validate(z.object({ phone: egyptianPhone, code: otpCode }), req.body);

    const existing = await prisma.user.findUnique({ where: { phone: body.phone }, select: { id: true } });
    if (existing && existing.id !== req.auth!.userId) {
      throw ApiError.conflict('هذا الرقم مستخدم في حساب آخر');
    }

    await consumeOtp(body.phone, 'change_phone', body.code, { userId: req.auth!.userId });

    const updated = await prisma.user.update({
      where: { id: req.auth!.userId },
      data: { phone: body.phone, phoneVerifiedAt: new Date(), countryCode: '+20' },
      select: publicUserSelect,
    });

    await notifyUser(updated.id, 'security', 'تم تحديث رقم الهاتف', 'تم تأكيد رقم هاتفك الجديد بنجاح.');

    return ok(res, {
      user: toPublicUser(updated),
      profileCompletion: await profileCompletion(updated.id, updated),
    });
  }),
);

// ═══════════════════════ حذف الحساب ═══════════════════════

authRouter.post(
  '/account/delete',
  requireAuth,
  accountLimiter,
  asyncHandler(async (req, res) => {
    const body = validate(
      z.object({
        password: z.string().optional(),
        confirmation: z.literal('DELETE', {
          message: 'اكتب DELETE لتأكيد حذف الحساب',
        }),
      }),
      req.body,
    );

    const user = await prisma.user.findUnique({
      where: { id: req.auth!.userId },
      select: { id: true, passwordHash: true },
    });
    if (!user) throw ApiError.notFound('المستخدم غير موجود');

    if (user.passwordHash) {
      if (!body.password || !bcrypt.compareSync(body.password, user.passwordHash)) {
        throw ApiError.unauthorized('كلمة المرور غير صحيحة');
      }
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { accountStatus: 'deleted', deletedAt: new Date() },
      }),
      prisma.webSession.deleteMany({ where: { userId: user.id } }),
    ]);

    await destroyWebSession(req, res);
    return ok(res, { deleted: true });
  }),
);
