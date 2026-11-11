import { z } from 'zod';

/**
 * توحيد أرقام الموبايل المصرية إلى الصيغة المحلية 01xxxxxxxxx.
 * يقبل: 01012345678 / +201012345678 / 201012345678 / 00201012345678
 * مع المسافات والشرطات.
 */
export function normalizeEgyptianPhone(input: string): string | null {
  let digits = input.trim().replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  if (digits.startsWith('00')) digits = digits.slice(2);

  // +20 1012345678 → 01012345678
  if (digits.startsWith('20') && digits.length === 12) {
    digits = `0${digits.slice(2)}`;
  }

  // 1012345678 → 01012345678
  if (/^1[0125]\d{8}$/.test(digits)) {
    digits = `0${digits}`;
  }

  return /^01[0125]\d{8}$/.test(digits) ? digits : null;
}

export const egyptianPhone = z
  .string()
  .trim()
  .min(1, 'رقم الهاتف مطلوب')
  .transform((value, ctx) => {
    const normalized = normalizeEgyptianPhone(value);
    if (!normalized) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'رقم غير صحيح — أمثلة صالحة: 010 / 011 / 012 / 015',
      });
      return z.NEVER;
    }
    return normalized;
  });

export const phoneOrEmail = z
  .string()
  .trim()
  .min(3, 'أدخل الهاتف أو البريد')
  .transform((value) => {
    if (value.includes('@')) return value.toLowerCase();
    return normalizeEgyptianPhone(value) ?? value;
  });

export const otpCode = z.string().trim().regex(/^\d{5}$/, 'الكود ٥ أرقام');

export function isEmail(value: string): boolean {
  return value.includes('@');
}
