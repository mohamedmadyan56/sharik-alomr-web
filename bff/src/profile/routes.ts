import { Router } from 'express';
import { z } from 'zod';
import {
  Education,
  JobStability,
  LivingPreference,
  MaritalStatus,
  MarriageIntent,
  MarriageTimeline,
  Relocation,
  SmokingStatus,
  WantsChildren,
} from '@prisma/client';
import { prisma } from '../db';
import { asyncHandler, ok } from '../http/envelope';
import { ApiError } from '../http/errors';
import { validate } from '../http/validate';
import { requireAuth } from '../auth/session';
import { normalizeEgyptianPhone } from '../auth/phone';
import { publicUserSelect, toPublicUser } from '../auth/user';
import { profileCompletion } from './completion';
import { persistentRateLimit } from '../security/rateLimit';
import {
  assertOwnedMediaKey,
  deleteObject,
  webMediaUrl,
} from '../media/storage';

export const profileRouter = Router();

const writeLimiter = persistentRateLimit({
  name: 'profile:write',
  limit: 120,
  windowSeconds: 60 * 60,
  key: (req) => req.auth?.userId ?? req.ip,
  message: 'تحديثات كثيرة — حاول بعد قليل',
});

profileRouter.use(requireAuth);

const optionalText = (max: number) => z.string().trim().max(max).optional().nullable();
const stringArray = (max = 30) => z.array(z.string().trim().min(1).max(60)).max(max);

function calcAge(dob: Date): number {
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const month = now.getMonth() - dob.getMonth();
  if (month < 0 || (month === 0 && now.getDate() < dob.getDate())) age -= 1;
  return age;
}

function jsonObject(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

const basicsSchema = z
  .object({
    firstName: z.string().trim().min(2, 'الاسم قصير').max(60).optional(),
    lastName: z.string().trim().max(60).optional().nullable(),
    gender: z.enum(['male', 'female']).optional(),
    dateOfBirth: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'التاريخ بصيغة YYYY-MM-DD')
      .optional(),
    country: z.string().trim().length(2).optional(),
    city: z.string().trim().min(2, 'المدينة مطلوبة').max(60).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'أرسل بيانات للتحديث');

const detailsSchema = z.object({
  nationality: optionalText(60),
  maritalStatus: z.nativeEnum(MaritalStatus).optional().nullable(),
  hasChildren: z.boolean().optional(),
  childrenCount: z.number().int().min(0).max(20).optional(),
  heightCm: z.number().int().min(120).max(230).optional().nullable(),
  education: z.nativeEnum(Education).optional().nullable(),
  university: optionalText(120),
  profession: optionalText(120),
  incomeRange: optionalText(60),
  languages: stringArray(10).optional(),
  smoking: z.nativeEnum(SmokingStatus).optional().nullable(),
  smokingType: optionalText(60),
  weightHealth: optionalText(60),
  jobStability: z.nativeEnum(JobStability).optional().nullable(),
  legalRecord: z.boolean().optional(),
});

const marriageSchema = z.object({
  marriageIntent: z.nativeEnum(MarriageIntent).optional().nullable(),
  marriageTimeline: z.nativeEnum(MarriageTimeline).optional().nullable(),
  wantsChildren: z.nativeEnum(WantsChildren).optional().nullable(),
  childrenPlanned: optionalText(120),
  relocation: z.nativeEnum(Relocation).optional().nullable(),
  livingPreference: z.nativeEnum(LivingPreference).optional().nullable(),
  religion: optionalText(60),
  sect: optionalText(60),
  familyPrefs: z.record(z.string(), z.unknown()).optional(),
});

const aboutSchema = z.object({
  bio: z.string().trim().max(1000, 'النبذة طويلة').optional().nullable(),
  interests: stringArray(30).optional(),
  personality: stringArray(30).optional(),
  lifestyle: stringArray(30).optional(),
  lookingFor: z.string().trim().max(1000).optional().nullable(),
});

const preferencesSchema = z.object({
  countries: stringArray(20).optional(),
  ageMin: z.number().int().min(18).max(80).optional().nullable(),
  ageMax: z.number().int().min(18).max(80).optional().nullable(),
  heightMin: z.number().int().min(120).max(230).optional().nullable(),
  heightMax: z.number().int().min(120).max(230).optional().nullable(),
});

const privacySchema = z.object({
  profileVisibility: z.enum(['public', 'matches', 'private']).optional(),
  showOnlineStatus: z.boolean().optional(),
  hideLastSeen: z.boolean().optional(),
  cityOnlyLocation: z.boolean().optional(),
  searchable: z.boolean().optional(),
  privatePhotosNeedApproval: z.boolean().optional(),
  profilePhotosNeedApproval: z.boolean().optional(),
  temporaryPhotosTtlDays: z.number().int().min(1).max(30).optional(),
  watermarkPhotos: z.boolean().optional(),
});

const notificationSchema = z.object({
  match: z.boolean().optional(),
  messages: z.boolean().optional(),
  calls: z.boolean().optional(),
  community: z.boolean().optional(),
  prayer: z.boolean().optional(),
  consultation: z.boolean().optional(),
  emailWeekly: z.boolean().optional(),
  newLoginAlerts: z.boolean().optional(),
  twoFactorEnabled: z.boolean().optional(),
});

async function loadFullProfile(userId: string) {
  const [user, profile, marriage, about, preferences, privacy, notifications, photos, coreValues, dealBreakers, wallet] =
    await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: publicUserSelect }),
      prisma.profile.findUnique({ where: { userId } }),
      prisma.profileMarriage.findUnique({ where: { userId } }),
      prisma.profileAbout.findUnique({ where: { userId } }),
      prisma.userPreferences.findUnique({ where: { userId } }),
      prisma.privacySettings.findUnique({ where: { userId } }),
      prisma.notificationSettings.findUnique({ where: { userId } }),
      prisma.profilePhoto.findMany({
        where: { userId, status: 'active' },
        orderBy: [{ isPrimary: 'desc' }, { orderIndex: 'asc' }, { createdAt: 'desc' }],
      }),
      prisma.userCoreValue.findMany({ where: { userId }, include: { value: true } }),
      prisma.dealBreaker.findMany({ where: { userId, isActive: true }, include: { breaker: true } }),
      prisma.wallet.findUnique({ where: { userId } }),
    ]);

  if (!user) throw ApiError.notFound('المستخدم غير موجود');

  return {
    user: toPublicUser(user),
    profile,
    marriage,
    about,
    preferences,
    privacy,
    notifications,
    photos,
    coreValues: coreValues.map((row) => row.value),
    dealBreakers: dealBreakers.map((row) => row.breaker),
    wallet,
    completion: await profileCompletion(userId, user),
  };
}

profileRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    return ok(res, await loadFullProfile(req.auth!.userId));
  }),
);

profileRouter.get(
  '/completion',
  asyncHandler(async (req, res) => {
    return ok(res, await profileCompletion(req.auth!.userId));
  }),
);

profileRouter.patch(
  '/basics',
  writeLimiter,
  asyncHandler(async (req, res) => {
    const body = validate(basicsSchema, req.body);

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

    return ok(res, {
      user: toPublicUser(updated),
      age,
      completion: await profileCompletion(updated.id, updated),
    });
  }),
);

profileRouter.patch(
  '/details',
  writeLimiter,
  asyncHandler(async (req, res) => {
    const body = validate(detailsSchema, req.body);

    const profile = await prisma.profile.upsert({
      where: { userId: req.auth!.userId },
      create: {
        userId: req.auth!.userId,
        ...body,
        languages: body.languages ?? [],
      },
      update: {
        ...body,
        ...(body.languages ? { languages: body.languages } : {}),
      },
    });

    return ok(res, { profile, completion: await profileCompletion(req.auth!.userId) });
  }),
);

profileRouter.patch(
  '/marriage',
  writeLimiter,
  asyncHandler(async (req, res) => {
    const body = validate(marriageSchema, req.body);
    const { familyPrefs, ...marriageBody } = body;

    const marriage = await prisma.profileMarriage.upsert({
      where: { userId: req.auth!.userId },
      create: {
        userId: req.auth!.userId,
        ...marriageBody,
        familyPrefs: (familyPrefs ?? {}) as import('@prisma/client').Prisma.InputJsonValue,
      },
      update: {
        ...marriageBody,
        ...(familyPrefs
          ? { familyPrefs: familyPrefs as import('@prisma/client').Prisma.InputJsonValue }
          : {}),
      },
    });

    return ok(res, { marriage, completion: await profileCompletion(req.auth!.userId) });
  }),
);

profileRouter.patch(
  '/about',
  writeLimiter,
  asyncHandler(async (req, res) => {
    const body = validate(aboutSchema, req.body);

    const about = await prisma.profileAbout.upsert({
      where: { userId: req.auth!.userId },
      create: {
        userId: req.auth!.userId,
        ...body,
        interests: body.interests ?? [],
        personality: body.personality ?? [],
        lifestyle: body.lifestyle ?? [],
      },
      update: {
        ...body,
        ...(body.interests ? { interests: body.interests } : {}),
        ...(body.personality ? { personality: body.personality } : {}),
        ...(body.lifestyle ? { lifestyle: body.lifestyle } : {}),
      },
    });

    return ok(res, { about, completion: await profileCompletion(req.auth!.userId) });
  }),
);

profileRouter.patch(
  '/preferences',
  writeLimiter,
  asyncHandler(async (req, res) => {
    const body = validate(preferencesSchema, req.body);
    if (body.ageMin && body.ageMax && body.ageMin > body.ageMax) {
      throw ApiError.validation({ field: 'ageMin' }, 'الحد الأدنى أكبر من الحد الأقصى');
    }
    if (body.heightMin && body.heightMax && body.heightMin > body.heightMax) {
      throw ApiError.validation({ field: 'heightMin' }, 'الحد الأدنى أكبر من الحد الأقصى');
    }

    const preferences = await prisma.userPreferences.upsert({
      where: { userId: req.auth!.userId },
      create: { userId: req.auth!.userId, ...body, countries: body.countries ?? [] },
      update: { ...body, ...(body.countries ? { countries: body.countries } : {}) },
    });

    return ok(res, { preferences, completion: await profileCompletion(req.auth!.userId) });
  }),
);

profileRouter.put(
  '/deal-breakers',
  writeLimiter,
  asyncHandler(async (req, res) => {
    const body = validate(z.object({ keys: stringArray(30) }), req.body);

    const catalog = await prisma.dealBreakerCatalog.findMany({
      where: { key: { in: body.keys }, isActive: true },
    });
    if (catalog.length !== body.keys.length) {
      throw ApiError.validation({ field: 'keys' }, 'يوجد اختيار غير معروف');
    }

    await prisma.$transaction([
      prisma.dealBreaker.deleteMany({
        where: { userId: req.auth!.userId, breakerId: { notIn: catalog.map((row) => row.id) } },
      }),
      ...catalog.map((row) =>
        prisma.dealBreaker.upsert({
          where: { userId_breakerId: { userId: req.auth!.userId, breakerId: row.id } },
          create: { userId: req.auth!.userId, breakerId: row.id },
          update: { isActive: true },
        }),
      ),
    ]);

    return ok(res, { dealBreakers: catalog, completion: await profileCompletion(req.auth!.userId) });
  }),
);

profileRouter.put(
  '/core-values',
  writeLimiter,
  asyncHandler(async (req, res) => {
    const body = validate(z.object({ keys: stringArray(20) }), req.body);

    const values = await prisma.coreValue.findMany({
      where: { key: { in: body.keys }, isActive: true },
    });
    if (values.length !== body.keys.length) {
      throw ApiError.validation({ field: 'keys' }, 'يوجد اختيار غير معروف');
    }

    await prisma.$transaction([
      prisma.userCoreValue.deleteMany({
        where: { userId: req.auth!.userId, valueId: { notIn: values.map((row) => row.id) } },
      }),
      ...values.map((row) =>
        prisma.userCoreValue.upsert({
          where: { userId_valueId: { userId: req.auth!.userId, valueId: row.id } },
          create: { userId: req.auth!.userId, valueId: row.id },
          update: {},
        }),
      ),
    ]);

    return ok(res, { coreValues: values, completion: await profileCompletion(req.auth!.userId) });
  }),
);

profileRouter.get(
  '/catalog',
  asyncHandler(async (_req, res) => {
    const [coreValues, dealBreakers] = await Promise.all([
      prisma.coreValue.findMany({ where: { isActive: true }, orderBy: { labelAr: 'asc' } }),
      prisma.dealBreakerCatalog.findMany({ where: { isActive: true }, orderBy: { labelAr: 'asc' } }),
    ]);
    return ok(res, { coreValues, dealBreakers });
  }),
);

profileRouter.patch(
  '/privacy',
  writeLimiter,
  asyncHandler(async (req, res) => {
    const body = validate(privacySchema, req.body);
    const privacy = await prisma.privacySettings.upsert({
      where: { userId: req.auth!.userId },
      create: { userId: req.auth!.userId, ...body },
      update: body,
    });
    return ok(res, { privacy, completion: await profileCompletion(req.auth!.userId) });
  }),
);

profileRouter.patch(
  '/notifications',
  writeLimiter,
  asyncHandler(async (req, res) => {
    const body = validate(notificationSchema, req.body);
    if (body.twoFactorEnabled === true) {
      const user = await prisma.user.findUnique({
        where: { id: req.auth!.userId },
        select: { phone: true, phoneVerifiedAt: true },
      });
      if (!user || !normalizeEgyptianPhone(user.phone) || !user.phoneVerifiedAt) {
        throw ApiError.badRequest(
          'التحقق بخطوتين يتطلب رقم هاتف موثّقًا — وثّق رقمك أولًا ثم فعّله',
        );
      }
    }
    const notifications = await prisma.notificationSettings.upsert({
      where: { userId: req.auth!.userId },
      create: { userId: req.auth!.userId, ...body },
      update: body,
    });
    return ok(res, { notifications });
  }),
);

profileRouter.get(
  '/photos',
  asyncHandler(async (req, res) => {
    const photos = await prisma.profilePhoto.findMany({
      where: { userId: req.auth!.userId, status: 'active' },
      orderBy: [{ isPrimary: 'desc' }, { orderIndex: 'asc' }, { createdAt: 'desc' }],
    });
    return ok(res, { photos });
  }),
);

profileRouter.post(
  '/photos',
  writeLimiter,
  asyncHandler(async (req, res) => {
    const body = validate(
      z
        .object({
          url: z.string().url().max(2048).optional(),
          storageKey: z.string().min(10).max(300).optional(),
          category: z.enum(['public', 'private', 'one_time', 'temporary']).default('public'),
          isPrimary: z.boolean().default(false),
          orderIndex: z.number().int().min(0).max(20).default(0),
        })
        .refine((value) => Boolean(value.url || value.storageKey), {
          message: 'أرسل رابط الصورة أو مفتاح التخزين',
          path: ['url'],
        }),
      req.body,
    );

    if (body.storageKey) {
      assertOwnedMediaKey(body.storageKey, req.auth!.userId, 'profile_photo');
    }
    const resolvedUrl = body.storageKey ? webMediaUrl(body.storageKey) : body.url!;

    const count = await prisma.profilePhoto.count({
      where: { userId: req.auth!.userId, status: 'active' },
    });
    if (count >= 12) throw ApiError.badRequest('الحد الأقصى ١٢ صورة');

    const photo = await prisma.$transaction(async (tx) => {
      if (body.isPrimary) {
        await tx.profilePhoto.updateMany({
          where: { userId: req.auth!.userId, isPrimary: true },
          data: { isPrimary: false },
        });
      }
      return tx.profilePhoto.create({
        data: {
          userId: req.auth!.userId,
          url: resolvedUrl,
          storageKey: body.storageKey ?? null,
          category: body.category,
          isPrimary: body.isPrimary || count === 0,
          orderIndex: body.orderIndex,
        },
      });
    });

    return ok(res, { photo, completion: await profileCompletion(req.auth!.userId) }, undefined, 201);
  }),
);

profileRouter.delete(
  '/photos/:id',
  writeLimiter,
  asyncHandler(async (req, res) => {
    const id = z.string().min(1).parse(req.params.id);
    const photo = await prisma.profilePhoto.findFirst({
      where: { id, userId: req.auth!.userId, status: 'active' },
      select: { id: true, storageKey: true },
    });
    if (!photo) throw ApiError.notFound('الصورة غير موجودة');
    await prisma.profilePhoto.update({
      where: { id: photo.id },
      data: { status: 'removed' },
    });
    if (photo.storageKey) {
      void deleteObject(photo.storageKey).catch(() => undefined);
    }
    return ok(res, { removed: true, completion: await profileCompletion(req.auth!.userId) });
  }),
);

/** حفظ كل خطوات التعريف دفعة واحدة — يستخدمها زر إنهاء التعريف في الواجهة. */
profileRouter.post(
  '/onboarding',
  writeLimiter,
  asyncHandler(async (req, res) => {
    const body = validate(
      z.object({
        basics: basicsSchema,
        details: detailsSchema.optional(),
        marriage: marriageSchema.optional(),
        about: aboutSchema.optional(),
        preferences: preferencesSchema.optional(),
        privacy: privacySchema.optional(),
        dealBreakerKeys: stringArray(30).optional(),
        coreValueKeys: stringArray(20).optional(),
      }),
      req.body,
    );

    const dob = body.basics.dateOfBirth ? new Date(body.basics.dateOfBirth) : null;
    if (dob && calcAge(dob) < 18) throw ApiError.validation({ age: calcAge(dob) }, 'العمر أقل من ١٨ سنة');

    const dealBreakers = body.dealBreakerKeys?.length
      ? await prisma.dealBreakerCatalog.findMany({ where: { key: { in: body.dealBreakerKeys }, isActive: true } })
      : [];
    const coreValues = body.coreValueKeys?.length
      ? await prisma.coreValue.findMany({ where: { key: { in: body.coreValueKeys }, isActive: true } })
      : [];

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: req.auth!.userId },
        data: {
          ...(body.basics.firstName ? { firstName: body.basics.firstName } : {}),
          ...(body.basics.lastName !== undefined ? { lastName: body.basics.lastName } : {}),
          ...(body.basics.gender ? { gender: body.basics.gender } : {}),
          ...(dob ? { dateOfBirth: dob } : {}),
          ...(body.basics.country ? { country: body.basics.country } : {}),
          ...(body.basics.city ? { city: body.basics.city } : {}),
        },
      });

      if (body.details) {
        await tx.profile.upsert({
          where: { userId: req.auth!.userId },
          create: { userId: req.auth!.userId, ...body.details, languages: body.details.languages ?? [] },
          update: { ...body.details, ...(body.details.languages ? { languages: body.details.languages } : {}) },
        });
      }

      if (body.marriage) {
        const { familyPrefs, ...marriageBody } = body.marriage;
        await tx.profileMarriage.upsert({
          where: { userId: req.auth!.userId },
          create: {
            userId: req.auth!.userId,
            ...marriageBody,
            familyPrefs: (familyPrefs ?? {}) as import('@prisma/client').Prisma.InputJsonValue,
          },
          update: {
            ...marriageBody,
            ...(familyPrefs
              ? { familyPrefs: familyPrefs as import('@prisma/client').Prisma.InputJsonValue }
              : {}),
          },
        });
      }

      if (body.about) {
        await tx.profileAbout.upsert({
          where: { userId: req.auth!.userId },
          create: {
            userId: req.auth!.userId,
            ...body.about,
            interests: body.about.interests ?? [],
            personality: body.about.personality ?? [],
            lifestyle: body.about.lifestyle ?? [],
          },
          update: {
            ...body.about,
            ...(body.about.interests ? { interests: body.about.interests } : {}),
            ...(body.about.personality ? { personality: body.about.personality } : {}),
            ...(body.about.lifestyle ? { lifestyle: body.about.lifestyle } : {}),
          },
        });
      }

      if (body.preferences) {
        await tx.userPreferences.upsert({
          where: { userId: req.auth!.userId },
          create: { userId: req.auth!.userId, ...body.preferences, countries: body.preferences.countries ?? [] },
          update: { ...body.preferences, ...(body.preferences.countries ? { countries: body.preferences.countries } : {}) },
        });
      }

      await tx.privacySettings.upsert({
        where: { userId: req.auth!.userId },
        create: { userId: req.auth!.userId, ...(body.privacy ?? {}) },
        update: body.privacy ?? {},
      });

      if (body.dealBreakerKeys) {
        await tx.dealBreaker.deleteMany({ where: { userId: req.auth!.userId } });
        if (dealBreakers.length) {
          await tx.dealBreaker.createMany({
            data: dealBreakers.map((row) => ({ userId: req.auth!.userId, breakerId: row.id })),
            skipDuplicates: true,
          });
        }
      }

      if (body.coreValueKeys) {
        await tx.userCoreValue.deleteMany({ where: { userId: req.auth!.userId } });
        if (coreValues.length) {
          await tx.userCoreValue.createMany({
            data: coreValues.map((row) => ({ userId: req.auth!.userId, valueId: row.id })),
            skipDuplicates: true,
          });
        }
      }
    });

    return ok(res, await loadFullProfile(req.auth!.userId));
  }),
);

/** تصدير بيانات المستخدم — حق الوصول والمراجعة. */
profileRouter.post(
  '/export',
  writeLimiter,
  asyncHandler(async (req, res) => {
    const full = await loadFullProfile(req.auth!.userId);
    await prisma.privacySettings.upsert({
      where: { userId: req.auth!.userId },
      create: { userId: req.auth!.userId, dataExportRequestedAt: new Date() },
      update: { dataExportRequestedAt: new Date() },
    });

    return ok(res, {
      exportedAt: new Date().toISOString(),
      data: full,
      note: 'نسخة من بيانات حسابك داخل المنصة. الصور والملفات تُطلب من الدعم عند الحاجة.',
    });
  }),
);

/** حذف الحساب من داخل الإعدادات — حذف ناعم يحفظ الالتزامات المالية. */
profileRouter.delete(
  '/',
  writeLimiter,
  asyncHandler(async (req, res) => {
    const body = validate(
      z.object({
        password: z.string().optional(),
        confirmation: z.literal('DELETE'),
      }),
      req.body,
    );

    const user = await prisma.user.findUnique({
      where: { id: req.auth!.userId },
      select: { id: true, passwordHash: true },
    });
    if (!user) throw ApiError.notFound('المستخدم غير موجود');
    if (user.passwordHash) {
      const bcrypt = await import('bcryptjs');
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

    return ok(res, { deleted: true });
  }),
);

/** ملاحظة: jsonObject محفوظة للاستخدام المستقبلي في familyPrefs. */
void jsonObject;
