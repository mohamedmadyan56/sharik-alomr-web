import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { WaliRelation } from '@prisma/client';
import { config } from '../config';
import { prisma } from '../db';
import { asyncHandler, ok } from '../http/envelope';
import { ApiError } from '../http/errors';
import { validate } from '../http/validate';
import { requireAuth, hashToken } from '../auth/session';
import { sendSms } from '../auth/sms';
import { persistentRateLimit } from '../security/rateLimit';

export const waliRouter = Router();

const inviteLimiter = persistentRateLimit({
  name: 'wali:invite',
  limit: 10,
  windowSeconds: 60 * 60,
  message: 'دعوات كثيرة — حاول بعد قليل',
});

const permissionSchema = z.object({
  viewMatchedCandidates: z.boolean().optional(),
  viewVerificationStatus: z.boolean().optional(),
  joinGroupChats: z.boolean().optional(),
  readDirectChats: z.boolean().optional(),
});

const inviteSchema = z.object({
  name: z.string().trim().min(2, 'اسم الولي مطلوب').max(80),
  relation: z.nativeEnum(WaliRelation),
  phone: z.string().trim().min(8).max(20),
  email: z.string().email().optional().or(z.literal('')).optional(),
  permissions: permissionSchema.optional(),
});

waliRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const [links, invitations] = await Promise.all([
      prisma.waliLink.findMany({
        where: { userId: req.auth!.userId },
        orderBy: { linkedSince: 'desc' },
        include: { wali: true, permissions: true },
      }),
      prisma.waliInvitation.findMany({
        where: { userId: req.auth!.userId, status: 'pending', expiresAt: { gt: new Date() } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return ok(res, {
      links: links.map((link) => ({
        id: link.id,
        status: link.status,
        linkedSince: link.linkedSince,
        sharedConversationsCount: link.sharedConversationsCount,
        wali: {
          id: link.wali.id,
          name: link.wali.name,
          relation: link.wali.relation,
          phone: link.wali.phone,
          email: link.wali.email,
          isVerified: link.wali.isVerified,
        },
        permissions: link.permissions,
      })),
      invitations: invitations.map((invitation) => ({
        id: invitation.id,
        phone: invitation.phone,
        email: invitation.email,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        createdAt: invitation.createdAt,
      })),
    });
  }),
);

waliRouter.post(
  '/invite',
  requireAuth,
  inviteLimiter,
  asyncHandler(async (req, res) => {
    const body = validate(inviteSchema, req.body);
    const userId = req.auth!.userId;

    const active = await prisma.waliLink.findFirst({
      where: { userId, status: { in: ['pending', 'active'] } },
    });
    if (active) throw ApiError.conflict('يوجد وليّ مرتبط أو دعوة قيد الانتظار بالفعل');

    const token = randomBytes(24).toString('hex');
    const permissions = {
      viewMatchedCandidates: body.permissions?.viewMatchedCandidates ?? true,
      viewVerificationStatus: body.permissions?.viewVerificationStatus ?? true,
      joinGroupChats: body.permissions?.joinGroupChats ?? true,
      readDirectChats: body.permissions?.readDirectChats ?? false,
    };

    const result = await prisma.$transaction(async (tx) => {
      const wali = await tx.wali.create({
        data: {
          name: body.name,
          relation: body.relation,
          phone: body.phone,
          email: body.email || null,
        },
      });
      const link = await tx.waliLink.create({
        data: {
          userId,
          waliId: wali.id,
          status: 'pending',
          permissions: { create: permissions },
        },
      });
      const invitation = await tx.waliInvitation.create({
        data: {
          userId,
          waliId: wali.id,
          phone: body.phone,
          email: body.email || null,
          token,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
      return { wali, link, invitation };
    });

    const linkUrl = `${config.appUrl}/wali/accept?token=${encodeURIComponent(token)}`;
    let smsSent = false;
    try {
      await sendSms(
        body.phone,
        `شريك العمر — دعوة وليّ: ${body.name}. افتح الرابط لقبول الدعوة وتحديد الصلاحيات: ${linkUrl}`,
      );
      smsSent = true;
    } catch (error) {
      console.error('[bff][wali] invite sms failed', error instanceof Error ? error.message : error);
    }

    return ok(
      res,
      {
        link: { id: result.link.id, status: result.link.status },
        invitation: {
          id: result.invitation.id,
          expiresAt: result.invitation.expiresAt.toISOString(),
        },
        inviteUrl: config.isProduction ? undefined : linkUrl,
        smsSent,
        ...(config.isProduction ? {} : { devToken: token }),
        message: smsSent
          ? 'تم إرسال دعوة الولي.'
          : 'تم إنشاء الدعوة، لكن تعذّر إرسال الرسالة. انسخ الرابط وأرسله يدويًا.',
      },
      undefined,
      201,
    );
  }),
);

waliRouter.patch(
  '/links/:id/permissions',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = z.string().min(1).parse(req.params.id);
    const body = validate(permissionSchema, req.body);

    const link = await prisma.waliLink.findFirst({ where: { id, userId: req.auth!.userId } });
    if (!link) throw ApiError.notFound('الربط غير موجود');

    const permissions = await prisma.waliPermission.upsert({
      where: { waliLinkId: link.id },
      create: { waliLinkId: link.id, ...body },
      update: body,
    });

    return ok(res, { permissions });
  }),
);

waliRouter.delete(
  '/links/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = z.string().min(1).parse(req.params.id);
    const link = await prisma.waliLink.findFirst({ where: { id, userId: req.auth!.userId } });
    if (!link) throw ApiError.notFound('الربط غير موجود');

    await prisma.$transaction([
      prisma.waliLink.update({ where: { id }, data: { status: 'revoked' } }),
      prisma.waliInvitation.updateMany({
        where: { waliId: link.waliId, status: 'pending' },
        data: { status: 'revoked' },
      }),
      prisma.waliSession.updateMany({
        where: { linkId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return ok(res, { revoked: true });
  }),
);

/** قبول دعوة الولي — مسار عام لأن الولي ليس لديه حساب مستخدم. */
waliRouter.post(
  '/accept',
  inviteLimiter,
  asyncHandler(async (req, res) => {
    const body = validate(z.object({ token: z.string().min(10) }), req.body);

    const invitation = await prisma.waliInvitation.findUnique({
      where: { token: body.token },
      include: { wali: true },
    });
    if (!invitation) throw ApiError.notFound('الدعوة غير موجودة');
    if (invitation.status !== 'pending') throw ApiError.badRequest('الدعوة لم تعد صالحة');
    if (new Date() > invitation.expiresAt) {
      await prisma.waliInvitation.update({ where: { id: invitation.id }, data: { status: 'expired' } });
      throw new ApiError('OTP_EXPIRED', 'انتهت صلاحية الدعوة — اطلب دعوة جديدة');
    }
    if (!invitation.waliId) throw ApiError.badRequest('الدعوة غير مكتملة');

    const sessionToken = randomBytes(32).toString('hex');
    const result = await prisma.$transaction(async (tx) => {
      await tx.waliInvitation.update({
        where: { id: invitation.id },
        data: { status: 'accepted' },
      });
      const link = await tx.waliLink.findFirst({
        where: { userId: invitation.userId, waliId: invitation.waliId!, status: 'pending' },
      });
      if (!link) throw ApiError.notFound('الربط غير موجود');
      const activeLink = await tx.waliLink.update({
        where: { id: link.id },
        data: { status: 'active', linkedSince: new Date() },
      });
      await tx.wali.update({ where: { id: invitation.waliId! }, data: { isVerified: true } });
      const session = await tx.waliSession.create({
        data: {
          linkId: activeLink.id,
          waliId: invitation.waliId!,
          tokenHash: hashToken(sessionToken, 'wali'),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
      return { link: activeLink, session };
    });

    return ok(res, {
      accepted: true,
      linkId: result.link.id,
      waliSessionToken: sessionToken,
      expiresAt: result.session.expiresAt.toISOString(),
      note: 'احتفظ بهذا الرمز للدخول إلى بوابة الولي.',
    });
  }),
);

/** بوابة الولي — عرض محدود حسب الصلاحيات. */
waliRouter.get(
  '/portal/me',
  asyncHandler(async (req, res) => {
    const token = (req.headers['x-wali-token'] as string | undefined) ?? '';
    if (!token) throw ApiError.unauthorized('رمز بوابة الولي مطلوب');

    const session = await prisma.waliSession.findUnique({
      where: { tokenHash: hashToken(token, 'wali') },
      include: {
        link: {
          include: {
            wali: true,
            permissions: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                city: true,
                profileQuality: true,
                verification: true,
              },
            },
          },
        },
      },
    });
    if (!session || session.revokedAt || new Date() > session.expiresAt) {
      throw ApiError.unauthorized('انتهت جلسة بوابة الولي');
    }
    if (session.link.status !== 'active') throw ApiError.forbidden('الربط غير نشط');

    await prisma.waliSession.update({ where: { id: session.id }, data: { lastUsedAt: new Date() } });

    return ok(res, {
      wali: {
        id: session.link.wali.id,
        name: session.link.wali.name,
        relation: session.link.wali.relation,
      },
      member: session.link.user,
      permissions: session.link.permissions,
      linkedSince: session.link.linkedSince,
    });
  }),
);
