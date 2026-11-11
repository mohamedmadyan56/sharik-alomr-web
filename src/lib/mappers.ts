import type { BlogArticle, PlanConfig } from "@/app-shared";
import type { ApiArticleDetail, ApiArticleSummary, ApiPlan } from "./api";

const FALLBACK_ARTICLE_IMAGE =
  "https://images.unsplash.com/photo-1603950227760-e609ce8e15b4?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=80&w=1080";

function paragraphs(body: string): string[] {
  return body
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/** يحوّل باقة الـ BFF إلى الشكل الذي تستخدمه واجهات الموقع. */
export function mapApiPlan(plan: ApiPlan): PlanConfig {
  return {
    id: plan.id,
    key: plan.key,
    tier: plan.tier,
    nameAr: plan.name,
    nameEn: plan.nameEn || plan.name,
    price: plan.priceAmount,
    annualPrice: plan.annualPriceAmount ?? plan.priceAmount * 10,
    annualSavingsPercent: plan.annualSavingsPercent ?? (plan.priceAmount > 0 ? 17 : 0),
    currency: plan.currency,
    active: plan.isActive,
    featured: plan.tier === "gold",
    descriptionAr: plan.descriptionAr ?? undefined,
    descriptionEn: plan.descriptionEn ?? undefined,
    synthetic: plan.synthetic,
    featuresAr: plan.features.map((row) => row.feature.nameAr),
    featuresEn: plan.features.map((row) => row.feature.nameEn || row.feature.nameAr),
  };
}

/** يحوّل مقال الـ BFF إلى شكل بطاقة/تفاصيل المقال في الموقع. */
export function mapApiArticle(article: ApiArticleSummary | ApiArticleDetail): BlogArticle {
  const categoryAr = article.category?.nameAr ?? "المجلة";
  const categoryEn = article.category?.nameEn ?? "Journal";
  const detail = "body" in article ? article : null;
  const body = detail?.body ?? "";
  const bodyParagraphs = paragraphs(body);
  const titleEn = detail?.seoTitle?.trim() || article.title;

  return {
    id: article.id,
    slug: article.slug,
    image: article.coverUrl || FALLBACK_ARTICLE_IMAGE,
    categoryAr,
    categoryEn,
    titleAr: article.title,
    titleEn,
    excerptAr:
      article.excerpt?.trim() || "اقرأ المقال كاملًا للتعرف على التفاصيل والأفكار العملية.",
    excerptEn:
      article.excerpt?.trim() || "Read the full article for details and practical ideas.",
    timeAr: `${article.readTimeMinutes} دقائق قراءة`,
    timeEn: `${article.readTimeMinutes} min read`,
    bodyAr: bodyParagraphs.length > 0 ? bodyParagraphs : ["المقال قيد المراجعة."],
    bodyEn: bodyParagraphs.length > 0 ? bodyParagraphs : ["This article is being reviewed."],
    publishedAt: article.publishedAt,
    isFeatured: article.isFeatured,
  };
}
