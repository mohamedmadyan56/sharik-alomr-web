"use client";

import { useApp } from "./providers";
import { HomePage } from "@/views/HomePage";

export default function Page() {
  const {
    go,
    language,
    plans,
    articles,
    articlesLoading,
    articlesError,
    theme,
    setLanguage,
    setTheme,
  } = useApp();
  return (
    <HomePage
      go={go}
      language={language}
      plans={plans}
      articles={articles}
      articlesLoading={articlesLoading}
      articlesError={articlesError}
      theme={theme}
      setLanguage={setLanguage}
      setTheme={setTheme}
    />
  );
}
