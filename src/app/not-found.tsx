"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/app-shared";
import { useApp } from "./providers";

export default function NotFound() {
  const { language } = useApp();
  const router = useRouter();
  const ar = language === "ar";

  return (
    <main className="status-page">
      <div className="status-card">
        <Logo language={language} />
        <span className="status-code" dir="ltr">
          404
        </span>
        <h1>{ar ? "الصفحة غير موجودة" : "Page not found"}</h1>
        <p>
          {ar
            ? "الرابط اللي فتحته مش موجود أو اتغيّر. تقدر ترجع للرئيسية وتكمل من هناك."
            : "The link you opened does not exist or has changed. You can return home and continue from there."}
        </p>
        <div className="status-actions">
          <Link className="btn btn-primary" href="/">
            {ar ? "العودة للرئيسية" : "Back to home"}
          </Link>
          <button
            className="btn btn-outline"
            type="button"
            onClick={() => router.back()}
          >
            {ar ? "رجوع" : "Go back"}
          </button>
        </div>
      </div>
    </main>
  );
}
