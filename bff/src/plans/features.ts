/** ترجمات إنجليزية لمفاتيح مزايا الباقات — للعرض فقط، والقيم الأصلية من DB. */
const FEATURE_NAME_EN: Record<string, string> = {
  ai_recommendation: 'AI recommendations',
  boost: 'Profile boost',
  premium_recommendation: 'Premium recommendations',
  private_photo_request: 'Private photo request',
  religious_consultation: 'Religious consultation',
  serious_interest: 'Serious interest',
  top_profile: 'Top profile',
  verification_request: 'Verification request',
  video_call: 'Video calls',
  voice_call: 'Voice calls',
};

export function featureNameEn(key: string, fallback: string): string {
  return FEATURE_NAME_EN[key] ?? fallback;
}

const PLAN_NAME_EN: Record<string, string> = {
  gold: 'Gold',
  platinum: 'Platinum',
  free: 'Free',
};

export function planNameEn(tier: string, key: string, fallback: string): string {
  return PLAN_NAME_EN[tier] ?? PLAN_NAME_EN[key] ?? fallback;
}
