import type { MetadataRoute } from "next";
import { legalDocuments } from "@/content/legal";

const SITE_URL = (
  process.env.SITE_URL ?? "https://sharik-alomr.com"
).replace(/\/$/, "");
const BFF_URL = process.env.BFF_URL ?? "http://127.0.0.1:4001";

type ArticleRow = {
  id: string;
  slug: string | null;
  publishedAt: string | null;
  updatedAt?: string | null;
};

async function publishedArticles(): Promise<ArticleRow[]> {
  try {
    const response = await fetch(`${BFF_URL}/api/blog/articles?limit=50`, {
      headers: { accept: "application/json" },
      next: { revalidate: 3600 },
    });
    if (!response.ok) return [];
    const payload = (await response.json()) as {
      data?: { results?: ArticleRow[] };
    };
    return payload.data?.results ?? [];
  } catch {
    // Sitemap generation must not fail when the BFF is temporarily unavailable.
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const articles = await publishedArticles();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/pricing`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/articles`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
  ];

  const legalPages: MetadataRoute.Sitemap = legalDocuments.map((document) => ({
    url: `${SITE_URL}/legal/${document.slug}`,
    lastModified: new Date(`${document.updatedAt}T12:00:00Z`),
    changeFrequency: "yearly",
    priority: document.slug === "privacy" || document.slug === "terms" ? 0.5 : 0.4,
  }));

  const articlePages: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${SITE_URL}/articles/${encodeURIComponent(article.slug ?? article.id)}`,
    lastModified: article.publishedAt
      ? new Date(article.publishedAt)
      : article.updatedAt
        ? new Date(article.updatedAt)
        : now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticPages, ...legalPages, ...articlePages];
}
