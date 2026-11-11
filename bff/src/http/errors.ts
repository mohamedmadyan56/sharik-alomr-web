/**
 * أخطاء الـ BFF الموحّدة — نفس شكل باك-اند الموبايل:
 *   نجاح: { data, meta:{ requestId, serverTime } }
 *   خطأ:  { error:{ code, message, details? }, meta:{ requestId, serverTime } }
 */
export type ApiErrorCode =
  | 'BAD_REQUEST'
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'TOKEN_EXPIRED'
  | 'SESSION_REVOKED'
  | 'ACCOUNT_SUSPENDED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'OTP_INVALID'
  | 'OTP_EXPIRED'
  | 'RATE_LIMITED'
  | 'FEATURE_DISABLED'
  | 'PROVIDER_ERROR'
  | 'INTERNAL_ERROR';

const STATUS: Record<ApiErrorCode, number> = {
  BAD_REQUEST: 400,
  VALIDATION_ERROR: 422,
  UNAUTHORIZED: 401,
  TOKEN_EXPIRED: 401,
  SESSION_REVOKED: 401,
  ACCOUNT_SUSPENDED: 403,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  OTP_INVALID: 400,
  OTP_EXPIRED: 400,
  RATE_LIMITED: 429,
  FEATURE_DISABLED: 403,
  PROVIDER_ERROR: 502,
  INTERNAL_ERROR: 500,
};

const ARABIC: Record<ApiErrorCode, string> = {
  BAD_REQUEST: 'طلب غير صالح',
  VALIDATION_ERROR: 'بيانات غير مكتملة أو غير صالحة',
  UNAUTHORIZED: 'يجب تسجيل الدخول أولاً',
  TOKEN_EXPIRED: 'انتهت صلاحية الجلسة — سجّل الدخول من جديد',
  SESSION_REVOKED: 'انتهت الجلسة — سجّل الدخول من جديد',
  ACCOUNT_SUSPENDED: 'الحساب موقوف أو محظور — تواصل مع الدعم',
  FORBIDDEN: 'لا تملك صلاحية لهذا الإجراء',
  NOT_FOUND: 'العنصر غير موجود',
  CONFLICT: 'تعارض في البيانات',
  OTP_INVALID: 'كود التحقق غير صحيح',
  OTP_EXPIRED: 'انتهت صلاحية كود التحقق',
  RATE_LIMITED: 'محاولات كثيرة — حاول لاحقاً',
  FEATURE_DISABLED: 'هذه الميزة غير متاحة حالياً',
  PROVIDER_ERROR: 'تعذّر إرسال كود التحقق — حاول لاحقاً',
  INTERNAL_ERROR: 'خطأ في الخادم — حاول مرة أخرى',
};

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly statusCode: number;
  readonly details?: unknown;

  constructor(code: ApiErrorCode, message?: string, details?: unknown) {
    super(message ?? ARABIC[code]);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = STATUS[code];
    this.details = details;
  }

  static badRequest(message?: string, details?: unknown) {
    return new ApiError('BAD_REQUEST', message, details);
  }
  static unauthorized(message?: string) {
    return new ApiError('UNAUTHORIZED', message);
  }
  static forbidden(message?: string, details?: unknown) {
    return new ApiError('FORBIDDEN', message, details);
  }
  static notFound(message?: string) {
    return new ApiError('NOT_FOUND', message);
  }
  static conflict(message?: string, details?: unknown) {
    return new ApiError('CONFLICT', message, details);
  }
  static validation(details?: unknown, message?: string) {
    return new ApiError('VALIDATION_ERROR', message, details);
  }
  static provider(message?: string, details?: unknown) {
    return new ApiError('PROVIDER_ERROR', message, details);
  }
}

export { ARABIC as API_ERROR_MESSAGES };
