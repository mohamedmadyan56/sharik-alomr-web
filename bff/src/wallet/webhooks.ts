import { Router } from 'express';
import type { Request } from 'express';
import { config } from '../config';
import { prisma } from '../db';
import { asyncHandler, ok } from '../http/envelope';
import { fulfillPayment, verifyPaymobHmac, verifyStripeSignature } from './payments';

export const paymentsRouter = Router();

type RawRequest = Request & { rawBody?: Buffer };

/** Stripe webhook — التحقق من التوقيع على الجسم الخام. */
paymentsRouter.post(
  '/webhook/stripe',
  asyncHandler(async (req, res) => {
    const raw = (req as RawRequest).rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}));
    if (!verifyStripeSignature(raw, req.headers['stripe-signature'] as string | undefined)) {
      res.status(400).json({ received: false, error: 'invalid signature' });
      return;
    }

    const event = req.body as {
      type?: string;
      data?: { object?: { metadata?: { paymentId?: string }; client_reference_id?: string; id?: string } };
    };

    if (event.type === 'checkout.session.completed') {
      const session = event.data?.object;
      const paymentId = session?.metadata?.paymentId;
      if (paymentId) {
        await fulfillPayment(paymentId, session?.id).catch((error) => {
          console.error('[bff][stripe] fulfill failed', error);
        });
      }
    }

    res.json({ received: true });
  }),
);

/** Paymob webhook — HMAC-SHA512 على الحقول القياسية. */
paymentsRouter.post(
  '/webhook/paymob',
  asyncHandler(async (req, res) => {
    const body = req.body as { obj?: Record<string, unknown>; hmac?: string };
    const hmac = body.hmac ?? (req.query.hmac as string | undefined);
    const payload = body.obj;
    if (!payload || !verifyPaymobHmac(payload, hmac)) {
      res.status(400).json({ received: false, error: 'invalid signature' });
      return;
    }

    const success = payload.success === true || payload.success === 'true';
    if (!success) {
      res.json({ received: true, processed: false });
      return;
    }

    const order = payload.order as { merchant_order_id?: string } | undefined;
    const reference = order?.merchant_order_id;
    if (!reference) {
      res.json({ received: true, processed: false });
      return;
    }

    const payment = await prisma.payment.findUnique({ where: { reference } });
    if (payment && payment.status !== 'succeeded') {
      await fulfillPayment(payment.id, String(payload.id ?? '')).catch((error) => {
        console.error('[bff][paymob] fulfill failed', error);
      });
    }

    res.json({ received: true, processed: true });
  }),
);

/** عودة المستخدم من Paymob بعد الدفع. */
paymentsRouter.get('/paymob/callback', (req, res) => {
  const reference = typeof req.query.merchant_order_id === 'string' ? req.query.merchant_order_id : '';
  const status = String(req.query.success ?? '') === 'true' ? 'success' : 'cancelled';
  res.redirect(
    `${config.appUrl}/dashboard/user?payment=${status}${reference ? `&ref=${encodeURIComponent(reference)}` : ''}`,
  );
});

paymentsRouter.get('/health', (_req, res) => {
  ok(res, { provider: config.payments.provider, configured: config.payments.provider !== 'dev' });
});
