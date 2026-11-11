import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../db';
import { ApiError } from '../http/errors';
import { requestMeta } from '../http/envelope';

export type RateLimitOptions = {
  /** اسم ثابت للحد — يظهر في مفتاح التخزين. */
  name: string;
  /** أقصى عدد طلبات داخل النافذة. */
  limit: number;
  /** طول النافذة بالثواني. */
  windowSeconds: number;
  /** مفتاح إضافي (مثل الهاتف أو البريد) بدل IP. */
  key?: (req: Request) => string | null | undefined;
  message?: string;
  /** تخطّي الحد في بيئة التطوير عند الحاجة. */
  skip?: (req: Request) => boolean;
};

function clientIp(req: Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * حد معدّل مشترك ومستمر في PostgreSQL.
 * لا يعتمد على ذاكرة العملية، لذلك يعمل مع أكثر من نسخة من الـ BFF.
 * العملية ذرّية عبر INSERT ... ON CONFLICT.
 */
export function persistentRateLimit(options: RateLimitOptions) {
  return (req: Request, res: Response, next: NextFunction): void => {
    void (async () => {
      if (options.skip?.(req)) {
        next();
        return;
      }

      const identifier = options.key?.(req) || clientIp(req);
      const key = `${options.name}:${identifier}`.slice(0, 240);

      // كل الحسابات الزمنية داخل PostgreSQL لتجنّب فروق المنطقة الزمنية
      // بين Node وقاعدة البيانات (timestamp without time zone).
      const rows = await prisma.$queryRaw<Array<{ count: number; retry_after: number }>>`
        INSERT INTO web_rate_limits (key, count, reset_at, updated_at)
        VALUES (${key}, 1, now() + make_interval(secs => ${options.windowSeconds}), now())
        ON CONFLICT (key) DO UPDATE SET
          count = CASE
            WHEN web_rate_limits.reset_at <= now() THEN 1
            ELSE web_rate_limits.count + 1
          END,
          reset_at = CASE
            WHEN web_rate_limits.reset_at <= now()
              THEN now() + make_interval(secs => ${options.windowSeconds})
            ELSE web_rate_limits.reset_at
          END,
          updated_at = now()
        RETURNING count,
          GREATEST(1, CEIL(EXTRACT(EPOCH FROM (reset_at - now()))))::int AS retry_after
      `;

      const row = rows[0];
      const count = Number(row?.count ?? 1);
      const remaining = Math.max(0, options.limit - count);
      const retryAfter = Math.max(1, Number(row?.retry_after ?? options.windowSeconds));

      res.setHeader('RateLimit-Limit', String(options.limit));
      res.setHeader('RateLimit-Remaining', String(remaining));
      res.setHeader('RateLimit-Reset', String(retryAfter));

      if (count > options.limit) {
        res.setHeader('Retry-After', String(retryAfter));
        throw new ApiError(
          'RATE_LIMITED',
          options.message ?? 'محاولات كثيرة — حاول بعد قليل',
          { retryAfterSeconds: retryAfter, ...requestMeta(res) },
        );
      }

      next();
    })().catch(next);
  };
}

/**
 * قفل الحساب بعد محاولات دخول فاشلة متكرّرة.
 * يعتمد على سجل login_attempts الموجود أصلًا، لذا يظل فعّالًا بين النسخ.
 */
export async function assertLoginAllowed(identifier: {
  phone?: string;
  email?: string;
  ip?: string;
}): Promise<void> {
  const since = new Date(Date.now() - 15 * 60 * 1000);

  const failures = await prisma.loginAttempt.count({
    where: {
      success: false,
      createdAt: { gte: since },
      ...(identifier.phone ? { phone: identifier.phone } : {}),
      ...(identifier.email ? { email: identifier.email } : {}),
      ...(identifier.ip ? { ipAddress: identifier.ip } : {}),
    },
  });

  // 5 محاولات فاشلة على الحساب أو 25 محاولة من نفس الـ IP.
  const accountLocked = Boolean(identifier.phone || identifier.email) && failures >= 5;
  const ipLocked = !identifier.phone && !identifier.email && failures >= 25;

  if (accountLocked || ipLocked) {
    throw new ApiError(
      'RATE_LIMITED',
      'تم إيقاف المحاولات مؤقتًا بعد عدة محاولات فاشلة — حاول بعد ١٥ دقيقة',
      { retryAfterSeconds: 900 },
    );
  }
}

/** تنظيف العدّادات المنتهية — يُستدعى من مهمة الصيانة الدورية. */
export async function cleanupRateLimits(): Promise<number> {
  return prisma.$executeRaw`
    DELETE FROM web_rate_limits
    WHERE reset_at < now() - interval '1 hour'
  `;
}
