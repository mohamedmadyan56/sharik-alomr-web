import { Prisma, PrismaClient, PermissionAccess } from '@prisma/client';

/**
 * بيانات التأسيس الإنتاجية — idempotent بالكامل.
 * تُشغّل مرة واحدة على قاعدة جديدة، ويمكن إعادة تشغيلها بأمان.
 */
const prisma = new PrismaClient();

const permissions = [
  { key: 'analytics.view', nameAr: 'التحليلات', group: 'analytics', isSensitive: false },
  { key: 'content.manage_blog', nameAr: 'إدارة المدونة', group: 'content', isSensitive: false },
  { key: 'content.manage_community', nameAr: 'إدارة المجتمع', group: 'content', isSensitive: false },
  { key: 'finance.adjust_credits', nameAr: 'تعديل الكريدت يدوياً', group: 'finance', isSensitive: true },
  { key: 'finance.manage_packages', nameAr: 'إدارة الباقات', group: 'finance', isSensitive: true },
  { key: 'finance.manage_pricing', nameAr: 'تعديل الأسعار', group: 'finance', isSensitive: true },
  { key: 'finance.view_transactions', nameAr: 'عرض سجل الكريدت', group: 'finance', isSensitive: false },
  { key: 'messages.moderate', nameAr: 'فحص الرسائل', group: 'messages', isSensitive: false },
  { key: 'messages.view_private', nameAr: 'قراءة المحادثات المباشرة', group: 'messages', isSensitive: false },
  { key: 'moderation.actions', nameAr: 'إجراءات الإشراف', group: 'moderation', isSensitive: false },
  { key: 'moderation.reports', nameAr: 'مراجعة البلاغات', group: 'moderation', isSensitive: false },
  { key: 'support.handle_users', nameAr: 'مساعدة المستخدمين', group: 'support', isSensitive: false },
  { key: 'system.feature_flags', nameAr: 'أعلام المزايا', group: 'system', isSensitive: true },
  { key: 'system.manage_admins', nameAr: 'إدارة حسابات الإدارة', group: 'system', isSensitive: true },
  { key: 'system.manage_limits', nameAr: 'الحدود اليومية', group: 'system', isSensitive: true },
  { key: 'system.manage_roles', nameAr: 'تعديل الصلاحيات', group: 'system', isSensitive: true },
  { key: 'system.manage_settings', nameAr: 'إعدادات المنصة', group: 'system', isSensitive: true },
  { key: 'system.view_audit_logs', nameAr: 'سجل التدقيق', group: 'system', isSensitive: false },
  { key: 'users.delete', nameAr: 'حذف المستخدمين', group: 'users', isSensitive: true },
  { key: 'users.suspend', nameAr: 'إيقاف/حظر المستخدمين', group: 'users', isSensitive: true },
  { key: 'users.view', nameAr: 'عرض المستخدمين', group: 'users', isSensitive: false },
  { key: 'users.view_private_data', nameAr: 'عرض البيانات الخاصة', group: 'users', isSensitive: true },
  { key: 'users.view_private_photos', nameAr: 'عرض الصور الخاصة', group: 'users', isSensitive: true },
  { key: 'verification.approve', nameAr: 'اعتماد التوثيق', group: 'verification', isSensitive: true },
  { key: 'verification.review', nameAr: 'مراجعة التوثيق', group: 'verification', isSensitive: false },
];

const roles: Array<{
  key: string;
  nameAr: string;
  scope: string;
  permissions: Array<[string, PermissionAccess]>;
}> = [
  {
    key: 'super_admin',
    nameAr: 'مدير عام',
    scope: 'all',
    permissions: permissions.map((permission) => [permission.key, 'full']),
  },
  {
    key: 'content_admin',
    nameAr: 'مدير محتوى',
    scope: 'content',
    permissions: [
      ['content.manage_blog', 'full'],
      ['content.manage_community', 'full'],
      ['moderation.reports', 'partial'],
      ['moderation.actions', 'partial'],
      ['users.view', 'partial'],
    ],
  },
  {
    key: 'moderator',
    nameAr: 'مشرف',
    scope: 'moderation',
    permissions: [
      ['moderation.reports', 'full'],
      ['moderation.actions', 'full'],
      ['messages.moderate', 'full'],
      ['content.manage_community', 'partial'],
      ['users.view', 'partial'],
      ['users.suspend', 'partial'],
    ],
  },
  {
    key: 'verification_admin',
    nameAr: 'مسؤول توثيق',
    scope: 'verification',
    permissions: [
      ['verification.review', 'full'],
      ['verification.approve', 'full'],
      ['users.view', 'partial'],
      ['users.view_private_photos', 'partial'],
    ],
  },
  {
    key: 'finance_admin',
    nameAr: 'مدير مالي',
    scope: 'finance',
    permissions: [
      ['finance.view_transactions', 'full'],
      ['finance.adjust_credits', 'full'],
      ['finance.manage_packages', 'full'],
      ['finance.manage_pricing', 'full'],
      ['users.view', 'partial'],
    ],
  },
  {
    key: 'customer_support',
    nameAr: 'دعم عملاء',
    scope: 'support',
    permissions: [
      ['support.handle_users', 'full'],
      ['users.view', 'partial'],
      ['verification.review', 'partial'],
      ['users.view_private_data', 'deny'],
      ['messages.view_private', 'deny'],
    ],
  },
  {
    key: 'analytics_admin',
    nameAr: 'محلل بيانات',
    scope: 'analytics',
    permissions: [
      ['analytics.view', 'full'],
      ['system.view_audit_logs', 'full'],
      ['users.view', 'partial'],
    ],
  },
];

const features = [
  { key: 'ai_recommendation', nameAr: 'ترشيح ذكي', creditCost: 10, dailyLimit: 20 },
  { key: 'boost', nameAr: 'تعزيز الملف', creditCost: 100 },
  { key: 'premium_recommendation', nameAr: 'ترشيح مميّز', creditCost: 25 },
  { key: 'private_photo_request', nameAr: 'طلب صورة خاصة', creditCost: 0, isFree: true },
  { key: 'religious_consultation', nameAr: 'استشارة دينية مع شيخ', creditCost: 5 },
  { key: 'serious_interest', nameAr: 'اهتمام جادّ', creditCost: 50 },
  { key: 'top_profile', nameAr: 'ملف Top', creditCost: 30, dailyLimit: 10 },
  { key: 'verification_request', nameAr: 'طلب توثيق', creditCost: 0, isFree: true },
  { key: 'video_call', nameAr: 'مكالمة مرئية', creditCost: 50, costUnit: 'per_minute' as const },
  { key: 'voice_call', nameAr: 'مكالمة صوتية', creditCost: 20, costUnit: 'per_minute' as const },
];

const plans = [
  {
    key: 'gold_monthly',
    name: 'جولد',
    tier: 'gold',
    priceAmount: 199,
    descriptionAr: 'حدود مضاعفة ومزايا مخصّصة لخُطّاب الجدّية',
    sortOrder: 1,
    features: [
      ['ai_recommendation', 50],
      ['top_profile', 30],
      ['voice_call', null],
      ['video_call', null],
    ] as Array<[string, number | null]>,
  },
  {
    key: 'platinum_monthly',
    name: 'بلاتينيوم',
    tier: 'platinum',
    priceAmount: 399,
    descriptionAr: 'كل مزايا جولد دون حدود تقريباً وأولوية ظهور',
    sortOrder: 2,
    features: [
      ['ai_recommendation', null],
      ['top_profile', null],
      ['voice_call', null],
      ['video_call', null],
      ['boost', null],
    ] as Array<[string, number | null]>,
  },
];

const packages = [
  { key: 'pack_100', name: '١٠٠ كريدت', baseCredits: 100, bonusCredits: 0, priceAmount: 50, sortOrder: 1 },
  { key: 'pack_300', name: '٣٠٠ كريدت', baseCredits: 300, bonusCredits: 30, priceAmount: 120, badge: '+١٠٪', sortOrder: 2 },
  { key: 'pack_750', name: '٧٥٠ كريدت', baseCredits: 750, bonusCredits: 100, priceAmount: 260, ribbon: 'الأكثر طلباً', isPopular: true, sortOrder: 3 },
  { key: 'pack_1500', name: '١٥٠٠ كريدت', baseCredits: 1500, bonusCredits: 250, priceAmount: 480, badge: '+١٧٪', sortOrder: 4 },
];

const topics = [
  { key: 'general', nameAr: 'عام', sortOrder: 1 },
  { key: 'engagement', nameAr: 'الخطوبة', sortOrder: 2 },
  { key: 'marriage_prep', nameAr: 'التحضير للزواج', sortOrder: 3 },
  { key: 'family', nameAr: 'الأسرة والأهل', sortOrder: 4 },
  { key: 'advice', nameAr: 'نصيحة واستشارة', sortOrder: 5 },
];

const categories = [
  { key: 'marriage_tips', nameAr: 'نصائح زواج' },
  { key: 'sharia', nameAr: 'أحكام شرعية' },
  { key: 'psychology', nameAr: 'علم نفس العلاقات' },
  { key: 'success_stories', nameAr: 'قصص نجاح' },
];

const settings: Array<{ key: string; value: Prisma.InputJsonValue; group: string }> = [
  {
    "key": "app.maintenance_mode",
    "value": false,
    "group": "app"
  },
  {
    "key": "app.min_android_version",
    "value": 26,
    "group": "app"
  },
  {
    "key": "app.min_ios_version",
    "value": "15.0",
    "group": "app"
  },
  {
    "key": "app.name",
    "value": "شريك العمر",
    "group": "app"
  },
  {
    "key": "app.support_email",
    "value": "support@sharik-alomr.com",
    "group": "app"
  },
  {
    "key": "app.tagline",
    "value": "زواج جاد… بضمان الشرع والخصوصية",
    "group": "app"
  },
  {
    "key": "boost.daily_extra_impressions",
    "value": 5,
    "group": "boost"
  },
  {
    "key": "boost.packages",
    "value": [
      {
        "days": 3,
        "credits": 100,
        "labelAr": "تجربة سريعة",
        "subtitleAr": "١٠٠ Credits"
      },
      {
        "days": 7,
        "badge": "موصى به",
        "credits": 200,
        "labelAr": "موصى به",
        "subtitleAr": "أعلى قيمة مقابل السعر"
      },
      {
        "days": 14,
        "credits": 350,
        "labelAr": "أعلى ظهور ممتد",
        "subtitleAr": "٣٥٠ Credits"
      }
    ],
    "group": "boost"
  },
  {
    "key": "consultation.booking_days",
    "value": 14,
    "group": "consultation"
  },
  {
    "key": "consultation.cancellation_hours",
    "value": 12,
    "group": "consultation"
  },
  {
    "key": "consultation.credits_per_session",
    "value": 5,
    "group": "consultation"
  },
  {
    "key": "consultation.egp_per_point",
    "value": 1,
    "group": "consultation"
  },
  {
    "key": "credits.call_billing_interval_seconds",
    "value": 30,
    "group": "credits"
  },
  {
    "key": "credits.premium_recommendation",
    "value": 30,
    "group": "credits"
  },
  {
    "key": "credits.refund_policy",
    "value": "never",
    "group": "credits"
  },
  {
    "key": "credits.serious_interest",
    "value": 50,
    "group": "credits"
  },
  {
    "key": "credits.top_profile",
    "value": 100,
    "group": "credits"
  },
  {
    "key": "credits.video_call_per_minute",
    "value": 50,
    "group": "credits"
  },
  {
    "key": "credits.voice_call_per_minute",
    "value": 20,
    "group": "credits"
  },
  {
    "key": "credits.welcome_bonus",
    "value": 100,
    "group": "credits"
  },
  {
    "key": "device.new_device_requires_verification",
    "value": true,
    "group": "security"
  },
  {
    "key": "device.one_account_one_device",
    "value": true,
    "group": "security"
  },
  {
    "key": "limits.ai_recommendations_per_day",
    "value": 20,
    "group": "limits"
  },
  {
    "key": "limits.calls_started_per_hour",
    "value": 10,
    "group": "limits"
  },
  {
    "key": "limits.likes_per_day",
    "value": 50,
    "group": "limits"
  },
  {
    "key": "limits.new_messages_per_day",
    "value": 100,
    "group": "limits"
  },
  {
    "key": "limits.private_photos_per_day",
    "value": 5,
    "group": "limits"
  },
  {
    "key": "limits.search_per_minute",
    "value": 60,
    "group": "limits"
  },
  {
    "key": "limits.top_profiles_per_day",
    "value": 10,
    "group": "limits"
  },
  {
    "key": "limits.verification_requests_per_week",
    "value": 3,
    "group": "limits"
  },
  {
    "key": "matching.deal_breakers_are_hard_filter",
    "value": true,
    "group": "matching"
  },
  {
    "key": "matching.min_score_to_show",
    "value": 45,
    "group": "matching"
  },
  {
    "key": "otp.length",
    "value": 5,
    "group": "otp"
  },
  {
    "key": "otp.max_attempts",
    "value": 5,
    "group": "otp"
  },
  {
    "key": "otp.max_per_day_per_ip",
    "value": 20,
    "group": "otp"
  },
  {
    "key": "otp.max_per_hour_per_email",
    "value": 5,
    "group": "otp"
  },
  {
    "key": "otp.max_per_hour_per_phone",
    "value": 5,
    "group": "otp"
  },
  {
    "key": "otp.resend_cooldown_seconds",
    "value": 45,
    "group": "otp"
  },
  {
    "key": "otp.ttl_seconds",
    "value": 600,
    "group": "otp"
  },
  {
    "key": "photos.private_ttl_hours",
    "value": 24,
    "group": "media"
  },
  {
    "key": "photos.temporary_ttl_days",
    "value": 7,
    "group": "media"
  },
  {
    "key": "photos.view_once_ttl_seconds",
    "value": 30,
    "group": "media"
  },
  {
    "key": "photos.watermark",
    "value": true,
    "group": "media"
  },
  {
    "key": "prayer.check_interval_seconds",
    "value": 30,
    "group": "prayer"
  },
  {
    "key": "prayer.default_city",
    "value": "القاهرة",
    "group": "prayer"
  },
  {
    "key": "prayer.default_country",
    "value": "EG",
    "group": "prayer"
  },
  {
    "key": "prayer.default_latitude",
    "value": 30.0444,
    "group": "prayer"
  },
  {
    "key": "prayer.default_longitude",
    "value": 31.2357,
    "group": "prayer"
  },
  {
    "key": "prayer.default_timezone",
    "value": "Africa/Cairo",
    "group": "prayer"
  },
  {
    "key": "reports.sla_hours",
    "value": 24,
    "group": "reports"
  },
  {
    "key": "verification.face_match_threshold",
    "value": 90,
    "group": "verification"
  },
  {
    "key": "verification.required_methods",
    "value": [
      "selfie"
    ],
    "group": "verification"
  },
  {
    "key": "verification.review_sla_hours",
    "value": 6,
    "group": "verification"
  },
  {
    "key": "wali.can_read_direct_chats",
    "value": false,
    "group": "wali"
  },
  {
    "key": "wali.invitation_ttl_days",
    "value": 7,
    "group": "wali"
  },
  {
    "key": "wali.session_ttl_days",
    "value": 90,
    "group": "wali"
  }
];

async function seedPermissionsAndRoles(): Promise<void> {
  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { key: permission.key },
      create: permission,
      update: {
        nameAr: permission.nameAr,
        group: permission.group,
        isSensitive: permission.isSensitive,
      },
    });
  }

  for (const role of roles) {
    const savedRole = await prisma.adminRole.upsert({
      where: { key: role.key },
      create: { key: role.key, nameAr: role.nameAr, scope: role.scope, isSystem: true },
      update: { nameAr: role.nameAr, scope: role.scope, isSystem: true },
    });

    for (const [permissionKey, access] of role.permissions) {
      const permission = await prisma.permission.findUniqueOrThrow({
        where: { key: permissionKey },
      });
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: savedRole.id,
            permissionId: permission.id,
          },
        },
        create: {
          roleId: savedRole.id,
          permissionId: permission.id,
          access,
        },
        update: { access },
      });
    }
  }
}

async function seedCatalog(): Promise<void> {
  for (const feature of features) {
    await prisma.featureCatalog.upsert({
      where: { key: feature.key },
      create: {
        key: feature.key,
        nameAr: feature.nameAr,
        creditCost: feature.creditCost,
        isFree: feature.isFree ?? false,
        costUnit: feature.costUnit ?? 'one_time',
        dailyLimit: feature.dailyLimit ?? null,
      },
      update: {
        nameAr: feature.nameAr,
        creditCost: feature.creditCost,
        isFree: feature.isFree ?? false,
        costUnit: feature.costUnit ?? 'one_time',
        dailyLimit: feature.dailyLimit ?? null,
        isActive: true,
      },
    });
  }

  for (const plan of plans) {
    const savedPlan = await prisma.subscriptionPlan.upsert({
      where: { key: plan.key },
      create: {
        key: plan.key,
        name: plan.name,
        tier: plan.tier,
        durationDays: 30,
        priceAmount: plan.priceAmount,
        descriptionAr: plan.descriptionAr,
        sortOrder: plan.sortOrder,
        isActive: true,
      },
      update: {
        name: plan.name,
        tier: plan.tier,
        priceAmount: plan.priceAmount,
        descriptionAr: plan.descriptionAr,
        sortOrder: plan.sortOrder,
        isActive: true,
      },
    });

    for (const [featureKey, limitValue] of plan.features) {
      const feature = await prisma.featureCatalog.findUniqueOrThrow({
        where: { key: featureKey },
      });
      await prisma.planFeature.upsert({
        where: {
          planId_featureId: { planId: savedPlan.id, featureId: feature.id },
        },
        create: {
          planId: savedPlan.id,
          featureId: feature.id,
          limitValue,
        },
        update: { limitValue },
      });
    }
  }

  for (const pack of packages) {
    await prisma.creditPackage.upsert({
      where: { key: pack.key },
      create: { ...pack, currency: 'EGP', isActive: true },
      update: {
        name: pack.name,
        baseCredits: pack.baseCredits,
        bonusCredits: pack.bonusCredits,
        priceAmount: pack.priceAmount,
        badge: pack.badge ?? null,
        ribbon: pack.ribbon ?? null,
        isPopular: pack.isPopular ?? false,
        sortOrder: pack.sortOrder,
        isActive: true,
      },
    });
  }

  for (const topic of topics) {
    await prisma.communityTopic.upsert({
      where: { key: topic.key },
      create: { ...topic, isFollowable: true, isActive: true },
      update: { nameAr: topic.nameAr, sortOrder: topic.sortOrder, isActive: true },
    });
  }

  for (const category of categories) {
    await prisma.blogCategory.upsert({
      where: { key: category.key },
      create: category,
      update: { nameAr: category.nameAr },
    });
  }

  for (const setting of settings) {
    await prisma.appSetting.upsert({
      where: { key: setting.key },
      create: setting,
      update: { value: setting.value, group: setting.group },
    });
  }
}

async function main(): Promise<void> {
  await seedPermissionsAndRoles();
  await seedCatalog();
  console.info('[seed] الأدوار والصلاحيات والباقات والمحتوى والإعدادات جاهزة.');
}

void main()
  .catch((error) => {
    console.error('[seed] failed', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
