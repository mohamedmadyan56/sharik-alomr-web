import 'dotenv/config';
import { z } from 'zod';

/**
 * إعدادات BFF الخاص بالويب.
 * كل القيم الحساسة تُقرأ من البيئة فقط — لا أسرار داخل الكود.
 */
const booleanFromEnv = z
  .string()
  .optional()
  .transform((value) => value === 'true' || value === '1');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4001),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL مطلوب'),
  WEB_ORIGIN: z
    .string()
    .default('http://localhost:3000,http://127.0.0.1:3000')
    .transform((value) =>
      value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  WEB_SESSION_SECRET: z.string().min(32, 'WEB_SESSION_SECRET يجب أن يكون 32 حرفاً على الأقل'),
  WEB_COOKIE_NAME: z.string().default('sharik_web_session'),
  SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(7),
  SESSION_REMEMBER_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  SESSION_IDLE_MINUTES: z.coerce.number().int().min(15).max(10080).default(240),
  ADMIN_COOKIE_NAME: z.string().default('sharik_admin_session'),
  ADMIN_SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(720).default(12),
  APP_URL: z.string().url().default('http://localhost:3000'),
  OTP_TTL_SECONDS: z.coerce.number().int().min(60).max(1800).default(300),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(20).default(5),
  OTP_RESEND_COOLDOWN_SECONDS: z.coerce.number().int().min(10).max(600).default(60),
  OTP_MAX_PER_HOUR_PER_PHONE: z.coerce.number().int().min(1).max(30).default(5),
  OTP_DEV_ECHO: booleanFromEnv,
  OTP_SMS_PROVIDER: z.enum(['dev', 'twilio']).default('dev'),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM_NUMBER: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_IDS: z.string().optional(),
  PAYMENT_PROVIDER: z.enum(['dev', 'manual', 'stripe', 'paymob']).default('dev'),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  PAYMOB_API_KEY: z.string().optional(),
  PAYMOB_INTEGRATION_ID: z.string().optional(),
  PAYMOB_IFRAME_ID: z.string().optional(),
  PAYMOB_HMAC_SECRET: z.string().optional(),
  METRICS_TOKEN: z.string().optional(),
  MEDIA_STORAGE: z.enum(['local', 's3']).default('local'),
  MEDIA_LOCAL_DIR: z.string().default('uploads'),
  MEDIA_MAX_UPLOAD_MB: z.coerce.number().min(1).max(30).default(10),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  S3_PUBLIC_BASE_URL: z.string().url().optional(),
  TRUST_PROXY: z
    .string()
    .optional()
    .transform((value) => value === 'true' || value === '1'),
  COOKIE_SECURE: z
    .string()
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true' || value === '1')),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  const issues = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('\n');
  throw new Error(`إعدادات BFF غير صالحة:\n${issues}`);
}

const data = parsed.data;
const isProduction = data.NODE_ENV === 'production';

const googleClientIds = [
  data.GOOGLE_CLIENT_ID,
  ...(data.GOOGLE_CLIENT_IDS ?? '').split(','),
]
  .map((value) => value?.trim())
  .filter((value): value is string => Boolean(value))
  .filter((value, index, all) => all.indexOf(value) === index);

if (isProduction && data.OTP_DEV_ECHO) {
  throw new Error('OTP_DEV_ECHO يجب أن يكون false في الإنتاج');
}
if (isProduction && data.OTP_SMS_PROVIDER === 'dev') {
  throw new Error('OTP_SMS_PROVIDER يجب أن يكون twilio في الإنتاج');
}
if (isProduction) {
  if (data.WEB_ORIGIN.some((origin) => !origin.startsWith('https://'))) {
    throw new Error('WEB_ORIGIN يجب أن يستخدم https في الإنتاج');
  }
  if (!data.APP_URL.startsWith('https://')) {
    throw new Error('APP_URL يجب أن يستخدم https في الإنتاج');
  }
  if (data.COOKIE_SECURE === false) {
    throw new Error('COOKIE_SECURE لا يمكن تعطيله في الإنتاج');
  }
  if (data.PAYMENT_PROVIDER === 'dev') {
    throw new Error('PAYMENT_PROVIDER يجب أن يكون manual أو stripe أو paymob في الإنتاج');
  }
}
if (data.PAYMENT_PROVIDER === 'stripe' && (!data.STRIPE_SECRET_KEY || !data.STRIPE_WEBHOOK_SECRET)) {
  throw new Error('بيانات Stripe ناقصة: STRIPE_SECRET_KEY وSTRIPE_WEBHOOK_SECRET');
}
if (data.PAYMENT_PROVIDER === 'paymob' && (!data.PAYMOB_API_KEY || !data.PAYMOB_INTEGRATION_ID)) {
  throw new Error('بيانات Paymob ناقصة: PAYMOB_API_KEY وPAYMOB_INTEGRATION_ID');
}
if (data.OTP_SMS_PROVIDER === 'twilio') {
  if (!data.TWILIO_ACCOUNT_SID || !data.TWILIO_AUTH_TOKEN || !data.TWILIO_FROM_NUMBER) {
    throw new Error('بيانات Twilio ناقصة: TWILIO_ACCOUNT_SID وTWILIO_AUTH_TOKEN وTWILIO_FROM_NUMBER');
  }
}
if (
  data.MEDIA_STORAGE === 's3' &&
  (!data.S3_BUCKET || !data.S3_ACCESS_KEY || !data.S3_SECRET_KEY)
) {
  throw new Error(
    'تخزين S3 ناقص: S3_BUCKET وS3_ACCESS_KEY وS3_SECRET_KEY مطلوبة عند MEDIA_STORAGE=s3',
  );
}

export const config = {
  env: data.NODE_ENV,
  isProduction,
  host: data.HOST,
  port: data.PORT,
  databaseUrl: data.DATABASE_URL,
  webOrigins: data.WEB_ORIGIN,
  session: {
    secret: data.WEB_SESSION_SECRET,
    cookieName: data.WEB_COOKIE_NAME,
    ttlDays: data.SESSION_TTL_DAYS,
    rememberDays: data.SESSION_REMEMBER_DAYS,
    idleMinutes: data.SESSION_IDLE_MINUTES,
    secureCookie: data.COOKIE_SECURE ?? isProduction,
  },
  admin: {
    cookieName: data.ADMIN_COOKIE_NAME,
    ttlHours: data.ADMIN_SESSION_TTL_HOURS,
    secureCookie: data.COOKIE_SECURE ?? isProduction,
  },
  appUrl: data.APP_URL.replace(/\/$/, ''),
  payments: {
    provider: data.PAYMENT_PROVIDER,
    stripe: {
      secretKey: data.STRIPE_SECRET_KEY ?? '',
      webhookSecret: data.STRIPE_WEBHOOK_SECRET ?? '',
    },
    paymob: {
      apiKey: data.PAYMOB_API_KEY ?? '',
      integrationId: data.PAYMOB_INTEGRATION_ID ?? '',
      iframeId: data.PAYMOB_IFRAME_ID ?? '',
      hmacSecret: data.PAYMOB_HMAC_SECRET ?? '',
    },
  },
  metricsToken: data.METRICS_TOKEN ?? null,
  media: {
    storage: data.MEDIA_STORAGE,
    localDir: data.MEDIA_LOCAL_DIR,
    maxUploadMb: data.MEDIA_MAX_UPLOAD_MB,
    s3: {
      endpoint: data.S3_ENDPOINT ?? null,
      region: data.S3_REGION,
      bucket: data.S3_BUCKET ?? null,
      accessKey: data.S3_ACCESS_KEY ?? null,
      secretKey: data.S3_SECRET_KEY ?? null,
      publicBaseUrl: data.S3_PUBLIC_BASE_URL?.replace(/\/+$/, '') ?? null,
    },
  },
  otp: {
    devEcho: data.OTP_DEV_ECHO && !isProduction,
    ttlSeconds: data.OTP_TTL_SECONDS,
    maxAttempts: data.OTP_MAX_ATTEMPTS,
    resendCooldownSeconds: data.OTP_RESEND_COOLDOWN_SECONDS,
    maxPerHourPerPhone: data.OTP_MAX_PER_HOUR_PER_PHONE,
    smsProvider: data.OTP_SMS_PROVIDER,
    twilio: {
      accountSid: data.TWILIO_ACCOUNT_SID ?? '',
      authToken: data.TWILIO_AUTH_TOKEN ?? '',
      fromNumber: data.TWILIO_FROM_NUMBER ?? '',
    },
  },
  google: {
    clientId: googleClientIds[0] ?? null,
    clientIds: googleClientIds,
    enabled: googleClientIds.length > 0,
  },
  trustProxy: data.TRUST_PROXY,
} as const;
