import { Router } from 'express';
import { z } from 'zod';
import { config } from '../config';
import { prisma } from '../db';
import { asyncHandler, ok } from '../http/envelope';
import { ApiError } from '../http/errors';
import { validate } from '../http/validate';
import { requireAuth } from '../auth/session';
import { persistentRateLimit } from '../security/rateLimit';
import { fulfillPayment, paymentReference, createPaymobCheckout, createStripeCheckout } from './payments';

export const walletRouter = Router();

walletRouter.use(requireAuth);

const checkoutLimiter = persistentRateLimit({
  name: 'wallet:checkout',
  limit: 20,
  windowSeconds: 60 * 60,
  key: (req) => req.auth?.userId ?? req.ip,
  message: 'محاولات دفع كثيرة — حاول بعد قليل',
});

walletRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = req.auth!.userId;
    const [wallet, transactions, packages, subscriptions, payments] = await Promise.all([
      prisma.wallet.findUnique({ where: { userId } }),
      prisma.creditTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      prisma.creditPackage.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { priceAmount: 'asc' }],
      }),
      prisma.subscription.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { plan: true },
      }),
      prisma.payment.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    return ok(res, {
      balance: wallet?.balanceCredits ?? 0,
      currency: wallet?.currency ?? 'EGP',
      transactions: transactions.map((row) => ({
        id: row.id,
        reference: row.reference,
        type: row.type,
        amount: row.amount,
        balanceAfter: row.balanceAfter,
        description: row.description,
        createdAt: row.createdAt.toISOString(),
      })),
      packages,
      subscriptions: subscriptions.map((row) => ({
        id: row.id,
        status: row.status,
        startedAt: row.startedAt,
        expiresAt: row.expiresAt,
        autoRenew: row.autoRenew,
        plan: row.plan,
      })),
      payments: payments.map((row) => ({
        id: row.id,
        reference: row.reference,
        purpose: row.purpose,
        amount: row.amount,
        currency: row.currency,
        provider: row.provider,
        status: row.status,
        createdAt: row.createdAt,
        paidAt: row.paidAt,
      })),
    });
  }),
);

walletRouter.get(
  '/packages',
  asyncHandler(async (_req, res) => {
    const packages = await prisma.creditPackage.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { priceAmount: 'asc' }],
    });
    return ok(res, { packages });
  }),
);

walletRouter.get(
  '/transactions',
  asyncHandler(async (req, res) => {
    const query = validate(
      z.object({
        limit: z.coerce.number().int().min(1).max(100).default(50),
        before: z.string().datetime().optional(),
      }),
      req.query,
    );
    const rows = await prisma.creditTransaction.findMany({
      where: {
        userId: req.auth!.userId,
        ...(query.before ? { createdAt: { lt: new Date(query.before) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: query.limit,
    });
    return ok(res, {
      results: rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
    });
  }),
);

walletRouter.post(
  '/checkout',
  checkoutLimiter,
  asyncHandler(async (req, res) => {
    const body = validate(
      z.object({
        purpose: z.enum(['credit_package', 'subscription']),
        refId: z.string().min(1),
      }),
      req.body,
    );
    const userId = req.auth!.userId;

    let amount = 0;
    let currency = 'EGP';
    let title = '';

    if (body.purpose === 'credit_package') {
      const pack = await prisma.creditPackage.findFirst({
        where: { id: body.refId, isActive: true },
      });
      if (!pack) throw ApiError.notFound('باقة الرصيد غير موجودة');
      amount = pack.priceAmount;
      currency = pack.currency;
      title = `${pack.name} — ${pack.baseCredits + pack.bonusCredits} رصيد`;
    } else {
      const plan = await prisma.subscriptionPlan.findFirst({
        where: { id: body.refId, isActive: true },
      });
      if (!plan) throw ApiError.notFound('الباقة غير موجودة');
      amount = plan.priceAmount;
      currency = plan.currency;
      title = plan.name;
    }

    if (amount <= 0) throw ApiError.badRequest('هذه الباقة غير متاحة للشراء');

    const recent = await prisma.payment.findFirst({
      where: {
        userId,
        purpose: body.purpose,
        refId: body.refId,
        status: 'pending',
        createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) },
      },
      orderBy: { createdAt: 'desc' },
    });

    const payment =
      recent ??
      (await prisma.payment.create({
        data: {
          reference: paymentReference(),
          userId,
          purpose: body.purpose,
          refId: body.refId,
          amount,
          currency,
          provider:
            config.payments.provider === 'stripe'
              ? 'stripe'
              : config.payments.provider === 'paymob'
                ? 'paymob'
                : 'card',
          status: 'pending',
        },
      }));

    if (config.payments.provider === 'dev' && !config.isProduction) {
      const paid = await fulfillPayment(payment.id, `dev-${payment.reference}`);
      const wallet = await prisma.wallet.findUnique({ where: { userId } });
      return ok(res, {
        payment: { ...paid, createdAt: paid.createdAt.toISOString(), paidAt: paid.paidAt?.toISOString() ?? null },
        paid: true,
        balance: wallet?.balanceCredits ?? 0,
        message: 'تم إتمام الدفع في بيئة التطوير وإضافة الرصيد.',
      });
    }

    if (config.payments.provider === 'manual') {
      return ok(res, {
        payment,
        paid: false,
        checkoutUrl: null,
        message: 'تم إنشاء طلب الدفع. حوّل المبلغ وأرسل رقم المرجع للدعم لتفعيل الطلب.',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true, phone: true, email: true, city: true },
    });

    let checkoutUrl: string | null = null;
    if (config.payments.provider === 'stripe') {
      checkoutUrl = await createStripeCheckout({
        paymentId: payment.id,
        reference: payment.reference,
        amount,
        currency,
        title,
        customerEmail: user?.email,
      });
    } else if (config.payments.provider === 'paymob') {
      checkoutUrl = await createPaymobCheckout({
        paymentId: payment.id,
        reference: payment.reference,
        amount,
        currency,
        customer: {
          firstName: user?.firstName ?? 'NA',
          lastName: user?.lastName ?? 'NA',
          phone: user?.phone ?? 'NA',
          email: user?.email ?? 'NA',
          city: user?.city ?? 'NA',
        },
      });
    }

    return ok(res, { payment, paid: false, checkoutUrl });
  }),
);

walletRouter.get(
  '/subscriptions',
  asyncHandler(async (req, res) => {
    const subscriptions = await prisma.subscription.findMany({
      where: { userId: req.auth!.userId },
      orderBy: { createdAt: 'desc' },
      include: { plan: true },
    });
    return ok(res, { subscriptions });
  }),
);

walletRouter.post(
  '/subscriptions/:id/cancel',
  checkoutLimiter,
  asyncHandler(async (req, res) => {
    const id = z.string().min(1).parse(req.params.id);
    const subscription = await prisma.subscription.findFirst({
      where: { id, userId: req.auth!.userId },
    });
    if (!subscription) throw ApiError.notFound('الاشتراك غير موجود');
    if (subscription.status !== 'active') throw ApiError.badRequest('الاشتراك غير نشط');

    await prisma.subscription.update({
      where: { id },
      data: { status: 'cancelled', cancelledAt: new Date(), autoRenew: false },
    });
    return ok(res, { cancelled: true });
  }),
);

walletRouter.get(
  '/payments',
  asyncHandler(async (req, res) => {
    const payments = await prisma.payment.findMany({
      where: { userId: req.auth!.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return ok(res, { payments });
  }),
);

walletRouter.get(
  '/feature-costs',
  asyncHandler(async (_req, res) => {
    const features = await prisma.featureCatalog.findMany({
      where: { isActive: true },
      orderBy: { nameAr: 'asc' },
    });
    return ok(res, { features });
  }),
);
