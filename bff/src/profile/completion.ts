import { prisma } from '../db';
import { ApiError } from '../http/errors';

export type ProfileCompletion = {
  percent: number;
  basicsComplete: boolean;
  missing: string[];
  breakdown: {
    basics: number;
    marriage: number;
    about: number;
    preferences: number;
    photos: number;
    privacy: number;
    verification: number;
  };
};

type CompletionUser = {
  firstName?: string | null;
  gender?: string | null;
  dateOfBirth?: Date | null;
  city?: string | null;
  verification?: string | null;
};

/**
 * حساب اكتمال الملف من البيانات الفعلية — مصدر واحد يستخدمه /auth/me
 * ولوحة التحكم وبوابة الدخول حتى لا تختلف الأرقام بين الشاشات.
 */
export async function profileCompletion(
  userId: string,
  user?: CompletionUser,
): Promise<ProfileCompletion> {
  const [current, profile, marriage, about, preferences, photos, privacy] = await Promise.all([
    user
      ? Promise.resolve(user)
      : prisma.user.findUnique({
          where: { id: userId },
          select: { firstName: true, gender: true, dateOfBirth: true, city: true, verification: true },
        }),
    prisma.profile.findUnique({ where: { userId } }),
    prisma.profileMarriage.findUnique({ where: { userId } }),
    prisma.profileAbout.findUnique({ where: { userId } }),
    prisma.userPreferences.findUnique({ where: { userId } }),
    prisma.profilePhoto.count({ where: { userId, status: 'active' } }),
    prisma.privacySettings.findUnique({ where: { userId } }),
  ]);

  const basicsComplete = Boolean(
    current?.firstName?.trim() && current?.gender && current?.dateOfBirth && current?.city,
  );
  const marriageComplete = Boolean(marriage?.marriageIntent && marriage?.marriageTimeline);
  const aboutComplete = Boolean(about?.bio?.trim() && (about?.interests?.length ?? 0) >= 3);
  const preferencesComplete = Boolean(preferences?.ageMin && preferences?.ageMax);
  const photosComplete = photos > 0;
  const privacyComplete = Boolean(privacy);
  const verificationComplete = current?.verification === 'verified';

  const breakdown = {
    basics: basicsComplete ? 25 : 0,
    marriage: marriageComplete ? 15 : 0,
    about: aboutComplete ? 20 : 0,
    preferences: preferencesComplete ? 10 : 0,
    photos: photosComplete ? 10 : 0,
    privacy: privacyComplete ? 5 : 0,
    verification: verificationComplete ? 15 : 0,
  };

  const missing: string[] = [];
  if (!basicsComplete) missing.push('basics');
  if (!marriageComplete) missing.push('marriage');
  if (!aboutComplete) missing.push('about');
  if (!preferencesComplete) missing.push('preferences');
  if (!photosComplete) missing.push('photos');
  if (!privacyComplete) missing.push('privacy');
  if (!verificationComplete) missing.push('verification');

  const percent = Object.values(breakdown).reduce((sum, value) => sum + value, 0);

  // مزامنة الحقل المشترك مع الموبايل — بدون انتظار.
  void prisma.user
    .update({ where: { id: userId }, data: { profileQuality: percent } })
    .catch(() => undefined);

  return { percent, basicsComplete, missing, breakdown };
}

/** بوابة بسيطة: لا نسمح باستخدام الداشبورد قبل استكمال البيانات الأساسية. */
export async function assertBasicsComplete(userId: string): Promise<void> {
  const completion = await profileCompletion(userId);
  if (!completion.basicsComplete) {
    throw new ApiError(
      'FORBIDDEN',
      'أكمل بياناتك الأساسية أولًا (الاسم، النوع، تاريخ الميلاد، المدينة)',
      { missing: completion.missing, next: 'PATCH /api/profile/basics' },
    );
  }
}
