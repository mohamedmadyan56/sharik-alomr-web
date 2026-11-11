"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Logo } from "@/app-shared";
import { useApp } from "./providers";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { language } = useApp();
  const ar = language === "ar";

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="status-page">
      <div className="status-card">
        <Logo language={language} />
        <span className="status-code" dir="ltr">
          500
        </span>
        <h1>{ar ? "حصل خطأ غير متوقع" : "Something went wrong"}</h1>
        <p>
          {ar
            ? "تعذّر تحميل الصفحة دلوقتي. جرّب تاني، ولو المشكلة استمرت تواصل مع الدعم."
            : "The page could not be loaded right now. Try again, and contact support if the problem continues."}
        </p>
        <div className="status-actions">
          <button className="btn btn-primary" type="button" onClick={reset}>
            {ar ? "إعادة المحاولة" : "Try again"}
          </button>
          <Link className="btn btn-outline" href="/">
            {ar ? "العودة للرئيسية" : "Back to home"}
          </Link>
        </div>
        {error.digest && (
          <code className="status-digest" dir="ltr">
            {error.digest}
          </code>
        )}
      </div>
    </main>
  );
}
