import type { NextFunction, Request, Response } from 'express';
import type { WebSession } from '@prisma/client';
import { createHmac, randomBytes } from 'node:crypto';
import { config } from '../config';
import { prisma } from '../db';
import { ApiError } from '../http/errors';
import { publicUserSelect, type PublicUserRow } from './user';

export function hashToken(value: string, namespace = 'session'): string {
  return createHmac('sha256', config.session.secret)
    .update(`${namespace}:${value}`)
    .digest('hex');
}

export function sessionCookieOptions(maxAgeSeconds?: number) {
  return {
    httpOnly: true,
    secure: config.session.secureCookie,
    sameSite: 'lax' as const,
    path: '/',
    ...(maxAgeSeconds ? { maxAge: maxAgeSeconds * 1000 } : {}),
  };
}

export interface CreatedSession {
  sessionId: string;
  expiresAt: Date;
}

export interface CreateSessionOptions {
  rememberMe?: boolean;
}

/**
 * إنشاء جلسة ويب جديدة وتخزين التوكن في كوكي httpOnly.
 * لا نخزّن التوكن نفسه في DB — نخزّن HMAC-SHA256 فقط.
 */
export async function createWebSession(
  userId: string,
  req: Request,
  res: Response,
  options: CreateSessionOptions = {},
): Promise<CreatedSession> {
  const token = randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const days = options.rememberMe ? config.session.rememberDays : config.session.ttlDays;
  const ttlSeconds = days * 24 * 60 * 60;
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

  const session = await prisma.webSession.create({
    data: {
      userId,
      tokenHash,
      userAgent: (req.headers['user-agent'] as string | undefined)?.slice(0, 512) ?? null,
      ipAddress: req.ip ?? null,
      expiresAt,
    },
  });

  res.cookie(config.session.cookieName, token, sessionCookieOptions(ttlSeconds));

  return { sessionId: session.id, expiresAt };
}

export type AuthenticatedSession = {
  session: WebSession;
  user: PublicUserRow;
};

/** قراءة الجلسة من الكوكي والتحقق من صلاحيتها وحساب المستخدم. */
export async function readWebSession(req: Request): Promise<AuthenticatedSession | null> {
  const token = req.cookies?.[config.session.cookieName] as string | undefined;
  if (!token) return null;

  const session = await prisma.webSession.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (!session) return null;

  const now = new Date();
  const idleDeadline = new Date(session.lastSeenAt.getTime() + config.session.idleMinutes * 60 * 1000);

  if (now > session.expiresAt || now > idleDeadline) {
    await prisma.webSession.deleteMany({ where: { id: session.id } });
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: publicUserSelect,
  });
  if (!user || user.accountStatus === 'deleted') {
    await prisma.webSession.deleteMany({ where: { id: session.id } });
    return null;
  }

  // تحديث آخر ظهور بشكل غير متزامن — لا نُبطئ الطلب.
  if (Date.now() - session.lastSeenAt.getTime() > 60 * 1000) {
    void prisma.webSession
      .update({ where: { id: session.id }, data: { lastSeenAt: now } })
      .catch(() => undefined);
  }

  return { session, user };
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  void (async () => {
    const current = await readWebSession(req);
    if (!current) throw ApiError.unauthorized('يجب تسجيل الدخول أولاً');
    if (current.user.accountStatus !== 'active') {
      throw new ApiError('ACCOUNT_SUSPENDED');
    }

    req.auth = {
      userId: current.user.id,
      sessionId: current.session.id,
      tokenHash: current.session.tokenHash,
    };
    res.locals.webUser = current.user;
    res.locals.webSession = current.session;
    next();
  })().catch(next);
}

/** إنهاء الجلسة الحالية ومسح الكوكي. */
export async function destroyWebSession(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.[config.session.cookieName] as string | undefined;
  if (token) {
    await prisma.webSession.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  res.clearCookie(config.session.cookieName, sessionCookieOptions());
}

/** إلغاء كل جلسات المستخدم — يُستخدم عند تغيير كلمة المرور أو تعطيل الحساب. */
export async function revokeUserSessions(userId: string, exceptSessionId?: string): Promise<number> {
  const result = await prisma.webSession.deleteMany({
    where: {
      userId,
      ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
    },
  });
  return result.count;
}

/** إعادة إصدار الجلسة الحالية بعد تغيير كلمة المرور — يحافظ على المستخدم داخل الموقع. */
export async function rotateWebSession(
  req: Request,
  res: Response,
  userId: string,
  options: CreateSessionOptions = {},
): Promise<CreatedSession> {
  await revokeUserSessions(userId);
  return createWebSession(userId, req, res, options);
}

/** تنظيف الجلسات المنتهية — مهمة صيانة دورية. */
export async function cleanupExpiredSessions(): Promise<number> {
  const result = await prisma.webSession.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return result.count;
}
