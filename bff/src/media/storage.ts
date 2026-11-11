import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config';
import { ApiError } from '../http/errors';

/**
 * تخزين وسائط الويب: S3 عند التهيئة، أو قرص محلي في التطوير/الخادم الواحد.
 * لا يوجد أي مسار static يخدم الملفات؛ كل وصول يمرّ عبر /api/media/file.
 */

const LOCAL_ROOT = path.resolve(process.cwd(), config.media.localDir);

const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  pdf: 'application/pdf',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  ogg: 'audio/ogg',
  wav: 'audio/wav',
  webm: 'audio/webm',
};

export const MEDIA_PURPOSES = {
  profile_photo: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
  community_image: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
} as const;

export type MediaPurpose = keyof typeof MEDIA_PURPOSES;

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
};

const KEY_PATTERN = /^([a-z_]+)\/([A-Za-z0-9_-]+)\/([0-9a-f-]{36})\.[a-z0-9]+$/;

export function normalizeContentType(value: string): string {
  return (value.split(';')[0] ?? '').trim().toLowerCase();
}

export function mediaExtension(contentType: string): string | null {
  return EXTENSIONS[normalizeContentType(contentType)] ?? null;
}

export function isAllowedMediaType(purpose: MediaPurpose, contentType: string): boolean {
  return (MEDIA_PURPOSES[purpose] as readonly string[]).includes(normalizeContentType(contentType));
}

export function parseMediaKey(key: string): { purpose: string; userId: string; fileId: string } | null {
  const match = KEY_PATTERN.exec(key);
  if (!match) return null;
  return { purpose: match[1]!, userId: match[2]!, fileId: match[3]! };
}

export function assertOwnedMediaKey(key: string, userId: string, purpose: MediaPurpose): void {
  const match = parseMediaKey(key);
  if (!match || match.purpose !== purpose || match.userId !== userId) {
    throw ApiError.forbidden('هذا الملف لا يخصّك');
  }
}

export function resolveLocalKey(key: string): string | null {
  if (!key || key.includes('\0') || key.includes('..') || path.isAbsolute(key)) return null;
  const target = path.resolve(LOCAL_ROOT, key);
  if (!target.startsWith(LOCAL_ROOT + path.sep)) return null;
  return target;
}

export function contentTypeForKey(key: string): string {
  const extension = path.extname(key).replace('.', '').toLowerCase();
  return CONTENT_TYPES[extension] ?? 'application/octet-stream';
}

export async function writeLocalObject(key: string, buffer: Buffer): Promise<void> {
  const target = resolveLocalKey(key);
  if (!target) throw new Error('مفتاح تخزين غير صالح');
  await fs.promises.mkdir(path.dirname(target), { recursive: true });
  await fs.promises.writeFile(target, buffer);
}

export async function localObjectMeta(
  key: string,
): Promise<{ contentType: string; contentLength: number } | null> {
  const target = resolveLocalKey(key);
  if (!target) return null;
  try {
    const stat = await fs.promises.stat(target);
    if (!stat.isFile()) return null;
    return { contentType: contentTypeForKey(key), contentLength: stat.size };
  } catch {
    return null;
  }
}

export async function removeLocalObject(key: string): Promise<void> {
  const target = resolveLocalKey(key);
  if (!target) return;
  await fs.promises.rm(target, { force: true });
}

type S3Module = typeof import('@aws-sdk/client-s3');
let s3ModulePromise: Promise<S3Module> | null = null;
let s3Client: import('@aws-sdk/client-s3').S3Client | null = null;

async function getS3Module(): Promise<S3Module> {
  s3ModulePromise ??= import('@aws-sdk/client-s3');
  return s3ModulePromise;
}

async function getS3Client(): Promise<import('@aws-sdk/client-s3').S3Client> {
  if (config.media.storage !== 's3') {
    throw ApiError.provider('تخزين S3 غير مهيأ');
  }
  if (!s3Client) {
    const { S3Client } = await getS3Module();
    s3Client = new S3Client({
      region: config.media.s3.region,
      endpoint: config.media.s3.endpoint ?? undefined,
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.media.s3.accessKey as string,
        secretAccessKey: config.media.s3.secretKey as string,
      },
    });
  }
  return s3Client;
}

export function publicObjectUrl(key: string): string | null {
  if (!config.media.s3.publicBaseUrl) return null;
  return `${config.media.s3.publicBaseUrl}/${key
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`;
}

/** رابط ثابت على الويب يمرّ عبر BFF، ويولّد رابط S3 موقّعًا عند كل طلب. */
export function webMediaUrl(key: string): string {
  return `${config.appUrl}/api/bff/media/file?key=${encodeURIComponent(key)}`;
}

export async function putObject(key: string, buffer: Buffer, contentType: string): Promise<void> {
  if (config.media.storage === 'local') {
    await writeLocalObject(key, buffer);
    return;
  }
  const { PutObjectCommand } = await getS3Module();
  const client = await getS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: config.media.s3.bucket as string,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );
}

export async function deleteObject(key: string): Promise<void> {
  if (config.media.storage === 'local') {
    await removeLocalObject(key);
    return;
  }
  const { DeleteObjectCommand } = await getS3Module();
  const client = await getS3Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: config.media.s3.bucket as string,
      Key: key,
    }),
  );
}

/** رابط قراءة مباشر: عام إن وُجد publicBaseUrl، وإلا رابط S3 موقّع قصير العمر. */
export async function signedReadUrl(key: string, expiresInSeconds = 900): Promise<string | null> {
  if (config.media.storage === 'local') return null;
  const publicUrl = publicObjectUrl(key);
  if (publicUrl) return publicUrl;
  const { GetObjectCommand } = await getS3Module();
  const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
  const client = await getS3Client();
  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: config.media.s3.bucket as string, Key: key }),
    { expiresIn: expiresInSeconds },
  );
}

export function localFilePath(key: string): string | null {
  if (config.media.storage !== 'local') return null;
  return resolveLocalKey(key);
}
