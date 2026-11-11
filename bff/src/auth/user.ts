import type { Prisma } from '@prisma/client';

export const sheikhSummarySelect = {
  id: true,
  displayName: true,
  balanceEgp: true,
  totalSessions: true,
  sessionDurationMinutes: true,
  isActive: true,
  isVerified: true,
  rating: true,
  specialties: true,
} as const;

export const publicUserSelect = {
  id: true,
  phone: true,
  email: true,
  firstName: true,
  lastName: true,
  gender: true,
  dateOfBirth: true,
  accountStatus: true,
  verification: true,
  isVerifiedBadge: true,
  profileQuality: true,
  country: true,
  city: true,
  phoneVerifiedAt: true,
  emailVerifiedAt: true,
  createdAt: true,
  passwordHash: true,
  sheikhProfile: { select: sheikhSummarySelect },
} satisfies Prisma.UserSelect;

export type PublicUserRow = Prisma.UserGetPayload<{ select: typeof publicUserSelect }>;

/** يحوّل صف المستخدم إلى شكل آمن للواجهة — بدون hash كلمة المرور. */
export function toPublicUser(user: PublicUserRow) {
  const { passwordHash, sheikhProfile, ...rest } = user;
  return {
    ...rest,
    // حسابات جوجل الجديدة تُنشأ برقم محجوز google_<sub> — لا نعرضه للمستخدم.
    phone: rest.phone.startsWith('google_') ? '' : rest.phone,
    hasPassword: Boolean(passwordHash),
    isSheikh: Boolean(sheikhProfile),
    sheikh: sheikhProfile ?? null,
  };
}
