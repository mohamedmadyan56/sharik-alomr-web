import { randomBytes } from 'node:crypto';
import { prisma } from '../db';

/** مرجع مالي مقروء — نفس نمط باك-اند الموبايل. */
export function transactionReference(): string {
  const now = Date.now().toString(36).toUpperCase();
  const rand = randomBytes(4).toString('hex').toUpperCase();
  return `TX-${now}-${rand}`;
}

/**
 * قيمة هدية الترحيب من إعدادات التطبيق المشتركة.
 * لو الإعداد غير موجود نرجع 100 — نفس القيمة الافتراضية للموبايل.
 */
export async function welcomeBonusAmount(): Promise<number> {
  const row = await prisma.appSetting.findUnique({
    where: { key: 'credits.welcome_bonus' },
    select: { value: true },
  });
  return typeof row?.value === 'number' ? row.value : 100;
}
