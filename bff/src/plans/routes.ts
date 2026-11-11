import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { asyncHandler, ok } from '../http/envelope';
import { validate } from '../http/validate';
import { featureNameEn, planNameEn } from './features';

export const plansRouter = Router();

const freePlan = {
  id: 'free',
  key: 'free',
  name: 'مجاني',
  nameEn: 'Free',
  tier: 'free',
  durationDays: 0,
  priceAmount: 0,
  annualPriceAmount: 0,
  annualSavingsPercent: 0,
  currency: 'EGP',
  cycle: 'monthly',
  descriptionAr: 'ابدأ رحلتك مجانًا مع ترشيحات أساسية وأدوات خصوصية كاملة.',
  descriptionEn: 'Start for free with basic recommendations and full privacy tools.',
  isActive: true,
  autoRenewDefault: false,
  maxUsers: null,
  sortOrder: 0,
  synthetic: true,
  features: [
    {
      limitValue: null,
      feature: {
        key: 'daily_recommendations',
        nameAr: 'ترشيحات أساسية يومية',
        nameEn: 'Daily recommendations',
        descriptionAr: null,
      },
    },
    {
      limitValue: 3,
      feature: {
        key: 'weekly_interests',
        nameAr: '3 اهتمامات أسبوعيًا',
        nameEn: '3 interests per week',
        descriptionAr: null,
      },
    },
    {
      limitValue: null,
      feature: {
        key: 'privacy_tools',
        nameAr: 'أدوات الخصوصية والأمان',
        nameEn: 'Privacy and safety tools',
        descriptionAr: null,
      },
    },
  ],
};

/**
 * GET /api/subscriptions/plans — نفس مسار الموبايل.
 * الباقات المدفوعة من DB، وبطاقة «مجاني» تعريفية للويب فقط.
 */
plansRouter.get(
  '/subscriptions/plans',
  asyncHandler(async (req, res) => {
    const query = validate(
      z.object({
        country: z.string().length(2).optional(),
      }),
      req.query,
    );

    const plans = await prisma.subscriptionPlan.findMany({
      where: {
        isActive: true,
        ...(query.country ? { OR: [{ country: null }, { country: query.country }] } : {}),
      },
      orderBy: { sortOrder: 'asc' },
      include: {
        features: {
          include: {
            feature: { select: { key: true, nameAr: true, descriptionAr: true } },
          },
        },
      },
    });

    const mapped = plans.map((plan) => ({
      ...plan,
      nameEn: planNameEn(plan.tier, plan.key, plan.name),
      annualPriceAmount: plan.priceAmount * 10,
      annualSavingsPercent: plan.priceAmount > 0 ? 17 : 0,
      features: plan.features.map((row) => ({
        ...row,
        feature: {
          ...row.feature,
          nameEn: featureNameEn(row.feature.key, row.feature.nameAr),
        },
      })),
    }));

    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    return ok(res, [freePlan, ...mapped]);
  }),
);
