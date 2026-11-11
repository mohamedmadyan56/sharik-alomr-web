"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useApp } from "@/app/providers";
import type { BlogArticle } from "@/app-shared";
import { ApiClientError, articlesApi } from "@/lib/api";
import { mapApiArticle } from "@/lib/mappers";
import { ArticleDetail, ArticlesPage } from "@/views/HomePage";

export default function Page() {
  const { go, language, articles, articlesLoading, articlesError } = useApp();
  const { articleId } = useParams<{ articleId: string }>();
  const [article, setArticle] = useState<BlogArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void articlesApi
      .get(articleId)
      .then((row) => {
        if (!cancelled) setArticle(mapApiArticle(row));
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        setArticle(null);
        setError(
          reason instanceof ApiClientError
            ? reason.message
            : "تعذّر تحميل المقال — حاول مرة أخرى.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [articleId]);

  if (loading) {
    return (
      <ArticlesPage
        go={go}
        language={language}
        articles={articles}
        loading
        error={articlesError}
      />
    );
  }

  if (!article) {
    return (
      <ArticlesPage
        go={go}
        language={language}
        articles={articles}
        loading={articlesLoading}
        error={error ?? articlesError}
      />
    );
  }

  return <ArticleDetail article={article} go={go} language={language} />;
}
