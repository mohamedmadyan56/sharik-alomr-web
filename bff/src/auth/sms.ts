import { request } from 'node:https';
import { config } from '../config';
import { ApiError } from '../http/errors';
import type { OtpPurpose } from './otp';

function toE164(phone: string): string {
  // أرقام مصرية محلية 01xxxxxxxxx → +201xxxxxxxxx
  return phone.startsWith('0') ? `+20${phone.slice(1)}` : `+${phone}`;
}

function twilioSend(to: string, body: string): Promise<void> {
  const { accountSid, authToken, fromNumber } = config.otp.twilio;
  const payload = new URLSearchParams({
    To: to,
    From: fromNumber,
    Body: body,
  }).toString();

  const url = new URL(
    `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`,
  );
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  return new Promise((resolve, reject) => {
    const req = request(
      {
        hostname: url.hostname,
        path: `${url.pathname}${url.search}`,
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(payload),
        },
        timeout: 10_000,
      },
      (res) => {
        let responseBody = '';
        res.setEncoding('utf8');
        res.on('data', (chunk: string) => {
          responseBody += chunk;
        });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve();
            return;
          }
          console.error('[bff][twilio] send failed', res.statusCode, responseBody.slice(0, 300));
          reject(ApiError.provider('تعذّر إرسال كود التحقق — حاول لاحقاً'));
        });
      },
    );

    req.on('timeout', () => {
      req.destroy(new Error('twilio timeout'));
    });
    req.on('error', (error) => {
      console.error('[bff][twilio] request error', error.message);
      reject(ApiError.provider('تعذّر إرسال كود التحقق — حاول لاحقاً'));
    });

    req.write(payload);
    req.end();
  });
}

const purposeText: Record<OtpPurpose, string> = {
  register: 'تأكيد إنشاء الحساب',
  login: 'تسجيل الدخول',
  reset: 'استعادة كلمة المرور',
  change_phone: 'تأكيد رقم الهاتف الجديد',
  two_factor: 'التحقق بخطوتين',
};

/** إرسال رسالة SMS عامة — dev يطبعها، وtwilio يرسلها فعليًا. */
export async function sendSms(phone: string, body: string): Promise<void> {
  if (config.otp.smsProvider === 'dev') {
    if (!config.otp.devEcho) {
      throw ApiError.provider('مزوّد الرسائل غير مهيأ — فعّل OTP_DEV_ECHO للتطوير');
    }
    console.info(`[bff][sms] ${phone}: ${body}`);
    return;
  }
  await twilioSend(toE164(phone), body);
}

/** إرسال كود التحقق: dev يطبع الكود في السجل، وtwilio يرسله SMS حقيقي. */
export async function sendOtpSms(phone: string, code: string, purpose: OtpPurpose): Promise<void> {
  if (config.otp.smsProvider === 'dev') {
    if (!config.otp.devEcho) {
      throw ApiError.provider('مزوّد الرسائل غير مهيأ — فعّل OTP_DEV_ECHO للتطوير');
    }
    console.info(`[bff][otp] ${purpose} ${phone}: ${code}`);
    return;
  }

  const body = `شريك العمر — كود ${purposeText[purpose]}: ${code}. صالح لمدة ${Math.round(
    config.otp.ttlSeconds / 60,
  )} دقائق. لا تشاركه مع أي شخص.`;
  await twilioSend(toE164(phone), body);
}
