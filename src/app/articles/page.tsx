"use client";

import { useApp } from "@/app/providers";
import { ArticlesPage } from "@/views/HomePage";

export default function Page() {
  const { go, language, articles, articlesLoading, articlesError } = useApp();
  return (
    <ArticlesPage
      go={go}
      language={language}
      articles={articles}
      loading={articlesLoading}
      error={articlesError}
    />
  );
}
