import { createHmac, timingSafeEqual } from 'node:crypto';
import { config } from '../config';
import { prisma } from '../db';
import { ApiError } from '../http/errors';
import { addCredits } from './credits';

export function paymentReference(): string {
  return `PAY-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

/**
 * إتمام دفعة ناجحة — idempotent.
 * تُستدعى من webhook المزوّد أو من المسار التجريبي/اليدوي.
 */
export async function fulfillPayment(paymentId: string, providerRef?: string) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw ApiError.notFound('الدفعة غير موجودة');
    if (payment.status === 'succeeded') return payment;

    const updated = await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: 'succeeded',
        paidAt: new Date(),
        ...(providerRef ? { providerRef } : {}),
      },
    });

    if (payment.purpose === 'credit_package' && payment.refId) {
      const pack = await tx.creditPackage.findUnique({ where: { id: payment.refId } });
      if (!pack) throw ApiError.notFound('باقة الرصيد غير موجودة');
      const total = pack.baseCredits + pack.bonusCredits;
      await addCredits(tx, payment.userId, total, 'purchase', `شراء ${pack.name}`, payment.id);
      await tx.notification.create({
        data: {
          userId: payment.userId,
          type: 'wallet',
          titleAr: 'تمت إضافة الرصيد',
          bodyAr: `تمت إضافة ${total} رصيد إلى محفظتك بنجاح.`,
          data: { paymentId: payment.id },
        },
      });
    }

    if (payment.purpose === 'subscription' && payment.refId) {
      const plan = await tx.subscriptionPlan.findUnique({ where: { id: payment.refId } });
      if (!plan) throw ApiError.notFound('الباقة غير موجودة');
      const expiresAt = new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000);
      await tx.subscription.create({
        data: {
          userId: payment.userId,
          planId: plan.id,
          status: 'active',
          expiresAt,
          autoRenew: false,
          priceLocked: true,
        },
      });
      await tx.notification.create({
        data: {
          userId: payment.userId,
          type: 'subscription',
          titleAr: 'تم تفعيل الاشتراك',
          bodyAr: `تم تفعيل باقة ${plan.name} حتى ${expiresAt.toLocaleDateString('ar-EG')}.`,
          data: { paymentId: payment.id, planId: plan.id },
        },
      });
    }

    return updated;
  });
}

export function verifyStripeSignature(rawBody: Buffer | string, signatureHeader: string | undefined): boolean {
  if (!signatureHeader || !config.payments.stripe.webhookSecret) return false;
  const parts = signatureHeader.split(',').reduce<Record<string, string>>((acc, part) => {
    const [key, value] = part.split('=');
    if (key && value) acc[key.trim()] = value.trim();
    return acc;
  }, {});
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;

  // منع إعادة تشغيل الأحداث القديمة لأكثر من 5 دقائق.
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;

  const expected = createHmac('sha256', config.payments.stripe.webhookSecret)
    .update(`${timestamp}.${rawBody.toString()}`)
    .digest('hex');

  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

const PAYMOB_HMAC_FIELDS = [
  'amount_cents',
  'created_at',
  'currency',
  'error_occured',
  'has_parent_transaction',
  'id',
  'integration_id',
  'is_3d_secure',
  'is_auth',
  'is_capture',
  'is_refunded',
  'is_standalone_payment',
  'is_voided',
  'order.id',
  'owner.id',
  'pending',
  'source_data.pan',
  'source_data.sub_type',
  'source_data.type',
  'success',
] as const;

function readPath(value: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (typeof current === 'object' && current !== null && key in current) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, value);
}

export function verifyPaymobHmac(payload: Record<string, unknown>, hmac: string | undefined): boolean {
  if (!hmac || !config.payments.paymob.hmacSecret) return false;
  const concatenated = PAYMOB_HMAC_FIELDS.map((field) => {
    const value = readPath(payload, field);
    return value === null || value === undefined ? '' : String(value);
  }).join('');
  const expected = createHmac('sha512', config.payments.paymob.hmacSecret)
    .update(concatenated)
    .digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(hmac);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** إنشاء جلسة دفع Stripe عبر REST بدون حزم إضافية. */
export async function createStripeCheckout(input: {
  paymentId: string;
  reference: string;
  amount: number;
  currency: string;
  title: string;
  customerEmail?: string | null;
}): Promise<string> {
  if (!config.payments.stripe.secretKey) throw ApiError.provider('Stripe غير مهيأ');

  const params = new URLSearchParams();
  params.set('mode', 'payment');
  params.set('success_url', `${config.appUrl}/dashboard/user?payment=success&ref=${encodeURIComponent(input.reference)}`);
  params.set('cancel_url', `${config.appUrl}/dashboard/user?payment=cancelled&ref=${encodeURIComponent(input.reference)}`);
  params.set('client_reference_id', input.reference);
  params.set('metadata[paymentId]', input.paymentId);
  params.set('line_items[0][quantity]', '1');
  params.set('line_items[0][price_data][currency]', input.currency.toLowerCase());
  params.set('line_items[0][price_data][unit_amount]', String(Math.round(input.amount * 100)));
  params.set('line_items[0][price_data][product_data][name]', input.title);
  if (input.customerEmail) params.set('customer_email', input.customerEmail);

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.payments.stripe.secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  const payload = (await response.json().catch(() => null)) as { url?: string; error?: { message?: string } } | null;
  if (!response.ok || !payload?.url) {
    console.error('[bff][stripe] checkout failed', response.status, payload?.error?.message);
    throw ApiError.provider('تعذّر بدء الدفع — حاول لاحقًا');
  }
  return payload.url;
}

/** إنشاء Payment Key من Paymob وإرجاع رابط iframe. */
export async function createPaymobCheckout(input: {
  paymentId: string;
  reference: string;
  amount: number;
  currency: string;
  customer: { firstName: string; lastName: string; phone: string; email: string; city: string };
}): Promise<string> {
  const { apiKey, integrationId, iframeId } = config.payments.paymob;
  if (!apiKey || !integrationId || !iframeId) throw ApiError.provider('Paymob غير مهيأ');

  const authResponse = await fetch('https://accept.paymob.com/api/auth/tokens', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey }),
  });
  const auth = (await authResponse.json().catch(() => null)) as { token?: string } | null;
  if (!authResponse.ok || !auth?.token) throw ApiError.provider('تعذّر الاتصال بمزوّد الدفع');

  const orderResponse = await fetch('https://accept.paymob.com/api/ecommerce/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth_token: auth.token,
      delivery_needed: false,
      amount_cents: Math.round(input.amount * 100),
      currency: input.currency,
      merchant_order_id: input.reference,
      items: [],
    }),
  });
  const order = (await orderResponse.json().catch(() => null)) as { id?: number } | null;
  if (!orderResponse.ok || !order?.id) throw ApiError.provider('تعذّر إنشاء طلب الدفع');

  const keyResponse = await fetch('https://accept.paymob.com/api/acceptance/payment_keys', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth_token: auth.token,
      amount_cents: Math.round(input.amount * 100),
      expiration: 3600,
      order_id: order.id,
      currency: input.currency,
      integration_id: Number(integrationId),
      billing_data: {
        first_name: input.customer.firstName || 'NA',
        last_name: input.customer.lastName || 'NA',
        phone_number: input.customer.phone || 'NA',
        email: input.customer.email || 'NA',
        city: input.customer.city || 'NA',
        country: 'EG',
        street: 'NA',
        building: 'NA',
        floor: 'NA',
        apartment: 'NA',
        postal_code: 'NA',
        state: 'NA',
      },
    }),
  });
  const key = (await keyResponse.json().catch(() => null)) as { token?: string } | null;
  if (!keyResponse.ok || !key?.token) throw ApiError.provider('تعذّر تجهيز الدفع');

  return `https://accept.paymob.com/api/acceptance/iframes/${encodeURIComponent(iframeId)}?payment_token=${encodeURIComponent(key.token)}`;
}
