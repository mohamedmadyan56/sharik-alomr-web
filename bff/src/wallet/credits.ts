import type { Prisma } from '@prisma/client';
import { ApiError } from '../http/errors';
import { transactionReference } from '../auth/welcome';

type Tx = Prisma.TransactionClient;

/** خصم رصيد بشكل ذرّي مع تسجيل حركة مالية. */
export async function spendCredits(
  tx: Tx,
  userId: string,
  amount: number,
  type: Prisma.CreditTransactionCreateInput['type'],
  description: string,
  relatedId?: string,
): Promise<number> {
  if (amount <= 0) {
    const wallet = await tx.wallet.findUnique({ where: { userId } });
    return wallet?.balanceCredits ?? 0;
  }

  const wallet = await tx.wallet.findUnique({ where: { userId } });
  if (!wallet) throw ApiError.badRequest('المحفظة غير مهيأة — تواصل مع الدعم');
  if (wallet.balanceCredits < amount) {
    throw ApiError.badRequest('رصيدك غير كافٍ لإتمام هذه الخطوة', {
      required: amount,
      balance: wallet.balanceCredits,
    });
  }

  const updated = await tx.wallet.update({
    where: { userId },
    data: { balanceCredits: { decrement: amount } },
  });

  await tx.creditTransaction.create({
    data: {
      reference: transactionReference(),
      userId,
      type,
      amount: -amount,
      balanceBefore: wallet.balanceCredits,
      balanceAfter: updated.balanceCredits,
      description,
      relatedId: relatedId ?? null,
    },
  });

  return updated.balanceCredits;
}

/** إضافة رصيد مع تسجيل حركة مالية. */
export async function addCredits(
  tx: Tx,
  userId: string,
  amount: number,
  type: Prisma.CreditTransactionCreateInput['type'],
  description: string,
  relatedId?: string,
): Promise<number> {
  const wallet = await tx.wallet.upsert({
    where: { userId },
    create: { userId, balanceCredits: amount },
    update: { balanceCredits: { increment: amount } },
  });

  await tx.creditTransaction.create({
    data: {
      reference: transactionReference(),
      userId,
      type,
      amount,
      balanceBefore: wallet.balanceCredits - amount,
      balanceAfter: wallet.balanceCredits,
      description,
      relatedId: relatedId ?? null,
    },
  });

  return wallet.balanceCredits;
}
