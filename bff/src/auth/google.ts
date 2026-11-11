import { config } from '../config';
import { ApiError } from '../http/errors';

/**
 * التحقق من Google OAuth Access Token عبر tokeninfo الرسمي.
 * لا نثق بأي بيانات قادمة من المتصفح قبل التأكد من صلاحية التوكن
 * ومطابقة `aud` لمعرّف العميل المسجّل، ثم نجلب الاسم من userinfo.
 */

const TOKENINFO_URL = 'https://oauth2.googleapis.com/tokeninfo';
const USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';
const PROVIDER_TIMEOUT_MS = 8_000;

export type GoogleProfile = {
  sub: string;
  email: string | null;
  emailVerified: boolean;
  name?: string;
  givenName?: string;
  familyName?: string;
  picture?: string;
};

type TokenInfo = {
  aud?: string;
  sub?: string;
  email?: string;
  email_verified?: string | boolean;
  expires_in?: string | number;
  scope?: string;
  error?: string;
  error_description?: string;
};

type UserInfo = {
  sub?: string;
  email?: string;
  email_verified?: boolean | string;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
};

async function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export async function verifyGoogleAccessToken(accessToken: string): Promise<GoogleProfile> {
  if (!config.google.enabled) {
    throw new ApiError(
      'FEATURE_DISABLED',
      'تسجيل الدخول بجوجل غير مُهيّأ على الخادم (GOOGLE_CLIENT_ID غير مضبوط)',
    );
  }

  const token = accessToken.trim();
  if (token.length < 20) throw ApiError.unauthorized('توكن جوجل غير صالح');

  let response: Response;
  try {
    response = await fetchWithTimeout(
      `${TOKENINFO_URL}?access_token=${encodeURIComponent(token)}`,
    );
  } catch {
    throw ApiError.provider('تعذّر التحقق من حساب جوجل — حاول لاحقاً');
  }

  if (!response.ok) {
    throw ApiError.unauthorized('انتهت صلاحية جلسة جوجل — حاول تسجيل الدخول مرة أخرى');
  }

  const info = (await response.json().catch(() => null)) as TokenInfo | null;
  if (!info?.sub || info.error) throw ApiError.unauthorized('توكن جوجل غير صالح');

  if (!info.aud || !config.google.clientIds.includes(info.aud)) {
    throw ApiError.unauthorized('هذا التطبيق غير مسموح له بهذا التوكن');
  }

  const expiresIn = Number(info.expires_in);
  if (!Number.isFinite(expiresIn) || expiresIn <= 0) {
    throw ApiError.unauthorized('انتهت صلاحية توكن جوجل');
  }

  const email = info.email?.trim().toLowerCase() || null;
  const emailVerified = info.email_verified === true || info.email_verified === 'true';
  if (email && !emailVerified) {
    throw ApiError.unauthorized('بريد جوجل غير موثّق');
  }

  const profile: GoogleProfile = {
    sub: info.sub,
    email,
    emailVerified,
  };

  // userinfo اختياري: بيجيب الاسم الكامل/الأول/الأخير. لو فشل نكمل بالبيانات الأساسية.
  try {
    const userResponse = await fetchWithTimeout(USERINFO_URL, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (userResponse.ok) {
      const user = (await userResponse.json().catch(() => null)) as UserInfo | null;
      if (user?.sub === info.sub) {
        profile.name = clean(user.name);
        profile.givenName = clean(user.given_name);
        profile.familyName = clean(user.family_name);
        profile.picture = clean(user.picture);

        const userEmail = user.email?.trim().toLowerCase() || null;
        const userEmailVerified =
          user.email_verified === true || user.email_verified === 'true';
        if (!profile.email && userEmail && userEmailVerified) {
          profile.email = userEmail;
          profile.emailVerified = true;
        }
      }
    }
  } catch {
    // الاسم ليس شرطاً للدخول — نتجاهل الخطأ ونستخدم الافتراضي.
  }

  return profile;
}
