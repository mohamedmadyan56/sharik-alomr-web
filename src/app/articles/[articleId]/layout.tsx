import type { Metadata } from "next";
import type { ReactNode } from "react";

const BFF_URL = process.env.BFF_URL ?? "http://127.0.0.1:4001";

type PageProps = {
  params: Promise<{ articleId: string }>;
};

type ArticleMeta = {
  title?: string;
  slug?: string | null;
  excerpt?: string | null;
  seoTitle?: string | null;
  metaDescription?: string | null;
  coverUrl?: string | null;
  publishedAt?: string | null;
};

async function loadArticle(identifier: string): Promise<ArticleMeta | null> {
  try {
    const response = await fetch(
      `${BFF_URL}/api/blog/articles/${encodeURIComponent(identifier)}`,
      {
        headers: { accept: "application/json" },
        next: { revalidate: 600 },
      },
    );
    if (!response.ok) return null;
    const payload = (await response.json()) as { data?: ArticleMeta };
    return payload.data ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { articleId } = await params;
  const article = await loadArticle(articleId);

  if (!article?.title) {
    return {
      title: "المقال غير موجود",
      robots: { index: false, follow: false },
    };
  }

  const title = article.seoTitle?.trim() || article.title;
  const description =
    article.metaDescription?.trim() || article.excerpt?.trim() || undefined;
  const canonical = `/articles/${encodeURIComponent(
    article.slug ?? articleId,
  )}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      url: canonical,
      title: `${title} | شريك العمر`,
      description,
      publishedTime: article.publishedAt ?? undefined,
      images: article.coverUrl ? [{ url: article.coverUrl }] : undefined,
    },
  };
}

export default function ArticleLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
