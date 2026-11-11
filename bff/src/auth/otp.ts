import bcrypt from 'bcryptjs';
import { randomInt } from 'node:crypto';
import { config } from '../config';
import { prisma } from '../db';
import { ApiError } from '../http/errors';
import { sendOtpSms } from './sms';

export type OtpPurpose = 'register' | 'login' | 'reset' | 'change_phone' | 'two_factor';

function generateOtp(length = 5): string {
  let code = '';
  for (let index = 0; index < length; index += 1) code += String(randomInt(0, 10));
  return code;
}

function hashOtp(code: string): string {
  return bcrypt.hashSync(code, 10);
}

function verifyOtpHash(code: string, hash: string): boolean {
  return bcrypt.compareSync(code, hash);
}

export interface StartedOtp {
  code: string;
  expiresInSeconds: number;
  resendAfterSeconds: number;
}

export interface StartOtpOptions {
  /** مطلوب لتغيير الهاتف — يربط الكود بحساب محدد. */
  userId?: string;
}

/**
 * بدء كود OTP للويب — مستقل تماماً عن otp_codes الخاصة بالموبايل.
 * كل الحدود من الإعدادات، ولا يُخزَّن الكود نفسه بل hash فقط.
 */
export async function startOtp(
  phone: string,
  purpose: OtpPurpose,
  options: StartOtpOptions = {},
): Promise<StartedOtp> {
  const lastHour = await prisma.webOtpCode.count({
    where: {
      phone,
      purpose,
      createdAt: { gte: new Date(Date.now() - 3_600_000) },
    },
  });
  if (lastHour >= config.otp.maxPerHourPerPhone) {
    throw new ApiError('RATE_LIMITED', 'محاولات كثيرة — حاول بعد ساعة', {
      retryAfterSeconds: 3600,
    });
  }

  const latest = await prisma.webOtpCode.findFirst({
    where: { phone, purpose, consumedAt: null },
    orderBy: { createdAt: 'desc' },
  });
  const wait = latest ? Math.ceil((latest.resendAfter.getTime() - Date.now()) / 1000) : 0;
  if (wait > 0) {
    throw new ApiError('RATE_LIMITED', `إعادة الإرسال بعد ${wait} ثانية`, {
      resendAfterSeconds: wait,
    });
  }

  const code = generateOtp(5);
  const record = await prisma.webOtpCode.create({
    data: {
      userId: options.userId ?? null,
      phone,
      codeHash: hashOtp(code),
      purpose,
      expiresAt: new Date(Date.now() + config.otp.ttlSeconds * 1000),
      resendAfter: new Date(Date.now() + config.otp.resendCooldownSeconds * 1000),
    },
  });

  try {
    await sendOtpSms(phone, code, purpose);
  } catch (error) {
    await prisma.webOtpCode.delete({ where: { id: record.id } }).catch(() => undefined);
    throw error;
  }

  return {
    code,
    expiresInSeconds: config.otp.ttlSeconds,
    resendAfterSeconds: config.otp.resendCooldownSeconds,
  };
}

/** التحقق من الكود مع عدّاد المحاولات — يستهلك الكود عند النجاح. */
export async function consumeOtp(
  phone: string,
  purpose: OtpPurpose,
  code: string,
  options: StartOtpOptions = {},
): Promise<void> {
  const record = await prisma.webOtpCode.findFirst({
    where: {
      phone,
      purpose,
      consumedAt: null,
      ...(options.userId ? { userId: options.userId } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!record) throw new ApiError('OTP_INVALID', 'لا يوجد كود — ابدأ من جديد');
  if (new Date() > record.expiresAt) throw new ApiError('OTP_EXPIRED');
  if (record.attempts >= config.otp.maxAttempts) {
    throw new ApiError('RATE_LIMITED', 'تجاوزت عدد المحاولات');
  }

  if (!verifyOtpHash(code, record.codeHash)) {
    await prisma.webOtpCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    throw new ApiError('OTP_INVALID');
  }

  await prisma.webOtpCode.update({
    where: { id: record.id },
    data: { consumedAt: new Date() },
  });
}

/** تنظيف الأكواد المنتهية/المستهلكة — مهمة صيانة دورية. */
export async function cleanupOtpCodes(): Promise<number> {
  const result = await prisma.webOtpCode.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
        { consumedAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      ],
    },
  });
  return result.count;
}
