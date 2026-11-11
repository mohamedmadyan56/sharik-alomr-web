"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/app-shared";
import { useApp } from "@/app/providers";

const STORAGE_KEY = "sharik-cookie-consent";

type ConsentRecord = {
  version: 1;
  preferences: boolean;
  decidedAt: string;
};

function readConsent(): ConsentRecord | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ConsentRecord>;
    if (parsed.version !== 1 || typeof parsed.preferences !== "boolean") {
      return null;
    }
    return {
      version: 1,
      preferences: parsed.preferences,
      decidedAt: parsed.decidedAt ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function CookieConsent() {
  const { language } = useApp();
  const ar = language === "ar";
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState(false);
  const [current, setCurrent] = useState<ConsentRecord | null>(null);

  useEffect(() => {
    const stored = readConsent();
    setCurrent(stored);
    if (!stored) {
      const timer = window.setTimeout(() => setOpen(true), 700);
      return () => window.clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    const reopen = () => {
      setCurrent(readConsent());
      setDetails(true);
      setOpen(true);
    };
    window.addEventListener("sharik:cookie-settings", reopen);
    return () => window.removeEventListener("sharik:cookie-settings", reopen);
  }, []);

  const decide = useCallback((preferences: boolean) => {
    const record: ConsentRecord = {
      version: 1,
      preferences,
      decidedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    } catch {
      /* التخزين غير متاح — نُغلق الشريط دون حفظ الاختيار. */
    }
    setCurrent(record);
    setOpen(false);
  }, []);

  if (!open) return null;

  return (
    <div
      className="cookie-consent"
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-consent-title"
      dir={ar ? "rtl" : "ltr"}
    >
      <div className="cookie-consent-card">
        <span className="cookie-consent-icon" aria-hidden="true">
          <Icon name="shield" size={22} />
        </span>
        <div className="cookie-consent-copy">
          <h2 id="cookie-consent-title">
            {ar ? "نحترم خصوصيتك" : "We respect your privacy"}
          </h2>
          <p>
            {ar
              ? "نستخدم ملفات تعريف ارتباط ضرورية لتشغيل الحساب والجلسة، وتفضيلات محلية لحفظ اللغة والمظهر. لا نستخدم حاليًا أي أدوات تحليلات أو إعلانات خارجية."
              : "We use essential cookies to run your account and session, plus local preferences to remember your language and theme. We currently use no external analytics or advertising."}
          </p>
          {details && (
            <ul className="cookie-consent-details">
              <li>
                <b>{ar ? "ضرورية" : "Essential"}</b>
                <span>
                  {ar
                    ? "جلسة الدخول وحماية الطلبات — لا تعمل المنصة بدونها."
                    : "Sign-in session and request protection — the platform cannot work without them."}
                </span>
              </li>
              <li>
                <b>{ar ? "تفضيلات" : "Preferences"}</b>
                <span>
                  {ar
                    ? "اللغة والمظهر وإعدادات العرض، وتُحفظ في متصفحك."
                    : "Language, theme, and display settings, stored in your browser."}
                </span>
              </li>
              <li>
                <b>{ar ? "تحليلات وإعلانات" : "Analytics and ads"}</b>
                <span>
                  {ar
                    ? "غير مستخدمة حاليًا. سنطلب موافقتك قبل تفعيل أي أداة."
                    : "Not used today. We will ask for consent before enabling any tool."}
                </span>
              </li>
            </ul>
          )}
          <div className="cookie-consent-links">
            <Link href="/legal/cookies">
              {ar ? "سياسة الكوكيز" : "Cookie policy"}
            </Link>
            <button type="button" onClick={() => setDetails((value) => !value)}>
              {details
                ? ar
                  ? "إخفاء التفاصيل"
                  : "Hide details"
                : ar
                  ? "عرض التفاصيل"
                  : "Show details"}
            </button>
            {current && (
              <span>
                {ar ? "اختيارك الحالي" : "Current choice"}:{" "}
                {current.preferences
                  ? ar
                    ? "كل المفضلات"
                    : "All preferences"
                  : ar
                    ? "الضروري فقط"
                    : "Essential only"}
              </span>
            )}
          </div>
        </div>
        <div className="cookie-consent-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => decide(true)}
          >
            {ar ? "قبول الكل" : "Accept all"}
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => decide(false)}
          >
            {ar ? "الضروري فقط" : "Essential only"}
          </button>
        </div>
      </div>
    </div>
  );
}
