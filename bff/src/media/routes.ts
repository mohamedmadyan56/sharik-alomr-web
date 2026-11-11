import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import { Router } from 'express';
import { z } from 'zod';
import { config } from '../config';
import { requireAuth } from '../auth/session';
import { asyncHandler, ok } from '../http/envelope';
import { ApiError } from '../http/errors';
import { validate } from '../http/validate';
import { persistentRateLimit } from '../security/rateLimit';
import {
  MEDIA_PURPOSES,
  assertOwnedMediaKey,
  isAllowedMediaType,
  localFilePath,
  localObjectMeta,
  mediaExtension,
  normalizeContentType,
  parseMediaKey,
  putObject,
  signedReadUrl,
  webMediaUrl,
  type MediaPurpose,
} from './storage';

export const mediaRouter = Router();

const uploadLimiter = persistentRateLimit({
  name: 'media:upload',
  limit: 30,
  windowSeconds: 60 * 60,
  message: 'رفعت صورًا كثيرة — حاول بعد قليل',
});

const IMAGE_PURPOSES = Object.keys(MEDIA_PURPOSES) as MediaPurpose[];

function detectImageType(buffer: Buffer): string | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF') {
    if (buffer.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  }
  if (buffer.length >= 12 && buffer.toString('ascii', 4, 8) === 'ftyp') {
    const brand = buffer.toString('ascii', 8, 12).toLowerCase();
    if (['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1'].includes(brand)) {
      return 'image/heic';
    }
  }
  return null;
}

function decodeBase64(value: string, maxBytes: number): Buffer {
  const comma = value.indexOf(',');
  let raw = value.startsWith('data:') && comma > 0 ? value.slice(comma + 1) : value;
  raw = raw.replace(/\s+/g, '');
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(raw)) {
    throw ApiError.validation({ base64Data: 'invalid' }, 'محتوى الملف غير صالح');
  }
  const remainder = raw.length % 4;
  if (remainder === 2) raw += '==';
  else if (remainder === 3) raw += '=';
  else if (remainder === 1) throw ApiError.validation({ base64Data: 'invalid' }, 'محتوى الملف غير صالح');

  const buffer = Buffer.from(raw, 'base64');
  if (buffer.length === 0) {
    throw ApiError.validation({ base64Data: 'empty' }, 'الملف فارغ');
  }
  if (buffer.length > maxBytes) {
    throw ApiError.validation(
      { maxBytes },
      `حجم الملف يتجاوز الحد الأقصى (${config.media.maxUploadMb} ميجابايت)`,
    );
  }
  return buffer;
}

mediaRouter.post(
  '/media/direct-upload',
  requireAuth,
  uploadLimiter,
  asyncHandler(async (req, res) => {
    const body = validate(
      z.object({
        purpose: z.enum(['profile_photo', 'community_image']),
        contentType: z.string().min(3).max(100),
        base64Data: z.string().min(1).max(45 * 1024 * 1024),
        fileName: z.string().max(200).optional(),
      }),
      req.body,
    );

    const contentType = normalizeContentType(body.contentType);
    const extension = mediaExtension(contentType);
    if (!extension || !isAllowedMediaType(body.purpose, contentType)) {
      throw ApiError.validation({ contentType: body.contentType }, 'نوع الملف غير مسموح');
    }

    const maxBytes = config.media.maxUploadMb * 1024 * 1024;
    const buffer = decodeBase64(body.base64Data, maxBytes);
    const detected = detectImageType(buffer);
    if (!detected) {
      throw ApiError.validation(
        { contentType },
        'محتوى الملف غير معروف — أرسل صورة JPG أو PNG أو WebP أو HEIC صالحة',
      );
    }
    if (detected !== contentType) {
      throw ApiError.validation(
        { contentType, detected },
        'نوع الملف المُعلن لا يطابق محتوى الملف الفعلي',
      );
    }

    const key = `${body.purpose}/${req.auth!.userId}/${randomUUID()}.${extension}`;
    await putObject(key, buffer, contentType);

    return ok(
      res,
      {
        key,
        storageKey: key,
        url: webMediaUrl(key),
        contentType,
        sizeBytes: buffer.length,
        maxBytes,
      },
      undefined,
      201,
    );
  }),
);

/**
 * يخدم ملفات الوسائط. الصور العامة (ملف شخصي/مجتمع) تُقرأ بالرابط غير القابل
 * للتخمين، بينما أي غرض آخر يتطلب جلسة مالك الملف.
 */
mediaRouter.get(
  '/media/file',
  asyncHandler(async (req, res) => {
    const query = validate(
      z.object({
        key: z.string().min(10).max(300),
      }),
      req.query,
    );

    const parsed = parseMediaKey(query.key);
    if (!parsed || !IMAGE_PURPOSES.includes(parsed.purpose as MediaPurpose)) {
      throw ApiError.notFound('الملف غير موجود');
    }
    const purpose = parsed.purpose as MediaPurpose;

    if (purpose !== 'profile_photo' && purpose !== 'community_image') {
      await new Promise<void>((resolve, reject) => {
        requireAuth(req, res, (error) => (error ? reject(error) : resolve()));
      });
      assertOwnedMediaKey(query.key, req.auth!.userId, purpose);
    }

    if (config.media.storage === 's3') {
      const url = await signedReadUrl(query.key);
      if (!url) throw ApiError.notFound('الملف غير موجود');
      res.setHeader('Cache-Control', 'private, max-age=300');
      res.redirect(302, url);
      return;
    }

    const meta = await localObjectMeta(query.key);
    const target = localFilePath(query.key);
    if (!meta || !target) throw ApiError.notFound('الملف غير موجود');

    res.setHeader('Content-Type', meta.contentType);
    res.setHeader('Content-Length', String(meta.contentLength));
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', 'inline');

    await new Promise<void>((resolve, reject) => {
      const stream = fs.createReadStream(target);
      stream.on('error', reject);
      stream.on('end', resolve);
      stream.pipe(res);
    });
  }),
);
