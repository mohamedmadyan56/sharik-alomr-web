import { createHmac, timingSafeEqual } from 'node:crypto';
import { config } from '../config';
import { ApiError } from '../http/errors';

/**
 * تحدي التحقق بخطوتين: توكن موقّع قصير العمر يُصدر فقط بعد التحقق من
 * كلمة المرور (أو من حساب Google)، ويُستخدم لربط كود الـ OTP بالحساب
 * دون إنشاء جلسة قبل إتمام الخطوة الثانية.
 */

const CHALLENGE_TTL_SECONDS = 10 * 60;

function sign(encoded: string): string {
  return createHmac('sha256', config.session.secret)
    .update(`2fa:${encoded}`)
    .digest('base64url');
}

export function createTwoFactorChallenge(userId: string): string {
  const payload = Buffer.from(
    JSON.stringify({
      sub: userId,
      exp: Date.now() + CHALLENGE_TTL_SECONDS * 1000,
    }),
  ).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function readTwoFactorChallenge(token: string): string {
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) throw ApiError.unauthorized('تحدي التحقق غير صالح');

  const expected = sign(encoded);
  const given = Buffer.from(signature);
  const wanted = Buffer.from(expected);
  if (given.length !== wanted.length || !timingSafeEqual(given, wanted)) {
    throw ApiError.unauthorized('تحدي التحقق غير صالح');
  }

  let payload: { sub?: unknown; exp?: unknown };
  try {
    payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  } catch {
    throw ApiError.unauthorized('تحدي التحقق غير صالح');
  }

  if (
    typeof payload.sub !== 'string' ||
    typeof payload.exp !== 'number' ||
    payload.exp < Date.now()
  ) {
    throw ApiError.unauthorized('انتهت صلاحية التحقق — سجّل الدخول من جديد');
  }

  return payload.sub;
}

export function twoFactorChallengeTtlSeconds(): number {
  return CHALLENGE_TTL_SECONDS;
}
