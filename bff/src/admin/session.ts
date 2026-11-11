import type { NextFunction, Request, Response } from 'express';
import type { Admin, AdminSession, Prisma } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { config } from '../config';
import { prisma } from '../db';
import { ApiError } from '../http/errors';
import { hashToken } from '../auth/session';

export function adminCookieOptions(maxAgeSeconds?: number) {
  return {
    httpOnly: true,
    secure: config.admin.secureCookie,
    sameSite: 'lax' as const,
    path: '/',
    ...(maxAgeSeconds ? { maxAge: maxAgeSeconds * 1000 } : {}),
  };
}

export type AdminWithAccess = Admin & {
  roles: Array<{ role: { id: string; key: string; nameAr: string; scope: string | null } }>;
  permissions: Set<string>;
};

export type AdminAuth = {
  admin: AdminWithAccess;
  session: AdminSession;
};

export async function loadAdmin(adminId: string): Promise<AdminWithAccess | null> {
  const admin = await prisma.admin.findUnique({
    where: { id: adminId },
    include: {
      roles: { include: { role: { include: { rolePermissions: { include: { permission: true } } } } } },
    },
  });
  if (!admin) return null;

  const permissions = new Set<string>();
  for (const row of admin.roles) {
    for (const rolePermission of row.role.rolePermissions) {
      if (rolePermission.access === 'full' || rolePermission.access === 'partial') {
        permissions.add(rolePermission.permission.key);
      }
    }
    if (row.role.key === 'super_admin') permissions.add('*');
  }

  const { roles, ...rest } = admin;
  return {
    ...rest,
    roles: roles.map((row) => ({
      role: {
        id: row.role.id,
        key: row.role.key,
        nameAr: row.role.nameAr,
        scope: row.role.scope,
      },
    })),
    permissions,
  };
}

export async function createAdminSession(adminId: string, req: Request, res: Response) {
  const token = randomBytes(32).toString('hex');
  const ttlSeconds = config.admin.ttlHours * 60 * 60;
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

  const session = await prisma.adminSession.create({
    data: {
      adminId,
      tokenHash: hashToken(token, 'admin'),
      ipAddress: req.ip ?? null,
      device: (req.headers['user-agent'] as string | undefined)?.slice(0, 512) ?? null,
      expiresAt,
    },
  });

  res.cookie(config.admin.cookieName, token, adminCookieOptions(ttlSeconds));
  return { session, expiresAt };
}

export async function readAdminSession(req: Request): Promise<AdminAuth | null> {
  const token = req.cookies?.[config.admin.cookieName] as string | undefined;
  if (!token) return null;

  const session = await prisma.adminSession.findUnique({
    where: { tokenHash: hashToken(token, 'admin') },
  });
  if (!session || session.revokedAt || new Date() > session.expiresAt) return null;

  const admin = await loadAdmin(session.adminId);
  if (!admin || admin.status !== 'active') return null;

  return { admin, session };
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  void (async () => {
    const current = await readAdminSession(req);
    if (!current) throw ApiError.unauthorized('يجب تسجيل الدخول بحساب إداري');
    req.admin = {
      adminId: current.admin.id,
      sessionId: current.session.id,
      permissions: current.admin.permissions,
      roles: current.admin.roles.map((row) => row.role.key),
    };
    res.locals.admin = current.admin;
    res.locals.adminSession = current.session;
    next();
  })().catch(next);
}

export function requirePermission(permission: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const access = req.admin?.permissions;
    if (!access || (!access.has('*') && !access.has(permission))) {
      next(ApiError.forbidden('لا تملك صلاحية لهذا الإجراء'));
      return;
    }
    next();
  };
}

export async function destroyAdminSession(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.[config.admin.cookieName] as string | undefined;
  if (token) {
    await prisma.adminSession.deleteMany({ where: { tokenHash: hashToken(token, 'admin') } });
  }
  res.clearCookie(config.admin.cookieName, adminCookieOptions());
}

export async function revokeAdminSessions(adminId: string, exceptSessionId?: string): Promise<number> {
  const result = await prisma.adminSession.updateMany({
    where: {
      adminId,
      revokedAt: null,
      ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
    },
    data: { revokedAt: new Date() },
  });
  return result.count;
}

export async function audit(input: {
  adminId?: string | null;
  actorRole?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  reason?: string | null;
  req?: Request;
}): Promise<void> {
  await prisma.auditLog
    .create({
      data: {
        actorAdminId: input.adminId ?? null,
        actorRole: input.actorRole ?? null,
        action: input.action,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
        oldValue: input.oldValue === undefined ? undefined : (input.oldValue as Prisma.InputJsonValue),
        newValue: input.newValue === undefined ? undefined : (input.newValue as Prisma.InputJsonValue),
        reason: input.reason ?? null,
        ipAddress: input.req?.ip ?? null,
        device: (input.req?.headers['user-agent'] as string | undefined)?.slice(0, 512) ?? null,
      },
    })
    .catch((error) => console.error('[bff][audit] failed', error));
}
