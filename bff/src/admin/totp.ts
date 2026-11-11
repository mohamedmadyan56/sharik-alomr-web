import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import { config } from '../config';
import { ApiError } from '../http/errors';

/**
 * TOTP (RFC 6238) لحسابات الإدارة — مستقل عن OTP الهاتفي للمستخدمين.
 * السر يُخزَّن مشفّرًا بـ AES-256-GCM، والتحدي بين كلمة المرور والكود
 * موقّع وقصير العمر حتى لا تُنشأ جلسة قبل إتمام الخطوة الثانية.
 */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const TOTP_DIGITS = 6;
const TOTP_STEP_SECONDS = 30;
const CHALLENGE_TTL_SECONDS = 10 * 60;

function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

function base32Decode(input: string): Buffer {
  const normalized = input.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (const character of normalized) {
    const index = BASE32_ALPHABET.indexOf(character);
    if (index === -1) throw ApiError.badRequest('سر التحقق غير صالح');
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

function hotp(secret: string, counter: number): string {
  const key = base32Decode(secret);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));

  const digest = createHmac('sha1', key).update(buffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  return String(binary % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, '0');
}

export function generateTotpCode(secret: string, forTime = Date.now()): string {
  return hotp(secret, Math.floor(forTime / 1000 / TOTP_STEP_SECONDS));
}

export function verifyTotpCode(
  secret: string,
  code: string,
  options: { window?: number; forTime?: number } = {},
): boolean {
  const normalized = code.replace(/\s+/g, '');
  if (!/^\d{6}$/.test(normalized)) return false;

  const window = options.window ?? 1;
  const counter = Math.floor((options.forTime ?? Date.now()) / 1000 / TOTP_STEP_SECONDS);
  const given = Buffer.from(normalized);

  for (let offset = -window; offset <= window; offset += 1) {
    const expected = Buffer.from(hotp(secret, counter + offset));
    if (given.length === expected.length && timingSafeEqual(given, expected)) {
      return true;
    }
  }
  return false;
}

export function totpUri(secret: string, account: string, issuer = 'Sharik Alomr'): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(TOTP_DIGITS),
    period: String(TOTP_STEP_SECONDS),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

function encryptionKey(): Buffer {
  return createHash('sha256')
    .update(`admin-totp:${config.session.secret}`)
    .digest();
}

export function encryptTotpSecret(secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('base64url')}:${tag.toString('base64url')}:${encrypted.toString('base64url')}`;
}

export function decryptTotpSecret(stored: string): string {
  // دعم القيم القديمة غير المشفّرة إن وُجدت.
  if (!stored.startsWith('v1:')) return stored;

  const [, ivPart, tagPart, dataPart] = stored.split(':');
  if (!ivPart || !tagPart || !dataPart) {
    throw ApiError.badRequest('سر التحقق غير صالح');
  }

  try {
    const decipher = createDecipheriv(
      'aes-256-gcm',
      encryptionKey(),
      Buffer.from(ivPart, 'base64url'),
    );
    decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(dataPart, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    throw ApiError.badRequest('تعذّر قراءة سر التحقق — أعد إعداده');
  }
}

function signChallenge(encoded: string): string {
  return createHmac('sha256', config.session.secret)
    .update(`admin2fa:${encoded}`)
    .digest('base64url');
}

export function createAdminTwoFactorChallenge(adminId: string): string {
  const payload = Buffer.from(
    JSON.stringify({
      sub: adminId,
      exp: Date.now() + CHALLENGE_TTL_SECONDS * 1000,
    }),
  ).toString('base64url');
  return `${payload}.${signChallenge(payload)}`;
}

export function readAdminTwoFactorChallenge(token: string): string {
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) throw ApiError.unauthorized('تحدي التحقق غير صالح');

  const expected = signChallenge(encoded);
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

export function adminTwoFactorChallengeTtlSeconds(): number {
  return CHALLENGE_TTL_SECONDS;
}
