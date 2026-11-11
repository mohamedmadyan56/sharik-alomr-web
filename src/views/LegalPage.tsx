"use client";

import Link from "next/link";
import {
  Icon,
  Logo,
  PreferenceControls,
  type Language,
  type Theme,
} from "@/app-shared";
import { useApp } from "@/app/providers";
import type { LegalDocument } from "@/content/legal";

function otherDocuments(current: string) {
  return [
    { slug: "about", ar: "عن شريك العمر", en: "About us" },
    { slug: "privacy", ar: "سياسة الخصوصية", en: "Privacy policy" },
    { slug: "terms", ar: "شروط الاستخدام", en: "Terms of use" },
    { slug: "cookies", ar: "ملفات تعريف الارتباط", en: "Cookie policy" },
    { slug: "refund", ar: "الاسترداد والإلغاء", en: "Refunds" },
    { slug: "safety", ar: "إرشادات الأمان", en: "Safety guide" },
  ].filter((item) => item.slug !== current);
}

export function LegalPageView({ document }: { document: LegalDocument }) {
  const { language, theme, setLanguage, setTheme } = useApp();
  return (
    <LegalPage
      document={document}
      language={language}
      theme={theme}
      setLanguage={setLanguage}
      setTheme={setTheme}
    />
  );
}

export function LegalPage({
  document,
  language,
  theme,
  setLanguage,
  setTheme,
}: {
  document: LegalDocument;
  language: Language;
  theme: Theme;
  setLanguage: (language: Language) => void;
  setTheme: (theme: Theme) => void;
}) {
  const ar = language === "ar";
  const title = ar ? document.titleAr : document.titleEn;
  const summary = ar ? document.summaryAr : document.summaryEn;
  const updated = new Intl.DateTimeFormat(ar ? "ar-EG" : "en-GB", {
    dateStyle: "long",
  }).format(new Date(`${document.updatedAt}T12:00:00Z`));

  return (
    <div className="legal-page">
      <header className="public-header">
        <div className="container header-inner">
          <Link href="/" aria-label={ar ? "شريك العمر" : "Sharik Alomr"}>
            <Logo language={language} />
          </Link>
          <div className="legal-header-actions">
            <PreferenceControls
              language={language}
              theme={theme}
              setLanguage={setLanguage}
              setTheme={setTheme}
              className="legal-preferences"
            />
            <Link className="legal-back" href="/">
              <Icon name="arrow" size={15} />
              <span>{ar ? "العودة للرئيسية" : "Back to home"}</span>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="legal-hero">
          <div className="container">
            <span className="eyebrow">
              <Icon name="shield" size={16} />
              {ar ? "الثقة والوضوح" : "Trust and clarity"}
            </span>
            <h1>{title}</h1>
            <p>{summary}</p>
            <small>
              {ar ? "آخر تحديث" : "Last updated"}: {updated}
            </small>
          </div>
        </section>

        <section className="legal-content container">
          <nav className="legal-toc" aria-label={ar ? "محتويات الصفحة" : "On this page"}>
            <b>{ar ? "محتويات الصفحة" : "On this page"}</b>
            {document.sections.map((section) => (
              <a key={section.id} href={`#${section.id}`}>
                {ar ? section.titleAr : section.titleEn}
              </a>
            ))}
            <div className="legal-toc-links">
              <b>{ar ? "صفحات أخرى" : "Other pages"}</b>
              {otherDocuments(document.slug).map((item) => (
                <Link key={item.slug} href={`/legal/${item.slug}`}>
                  {ar ? item.ar : item.en}
                </Link>
              ))}
            </div>
          </nav>

          <article className="legal-body">
            {document.sections.map((section) => {
              const paragraphs = ar ? section.paragraphsAr : section.paragraphsEn;
              const bullets = ar ? section.bulletsAr : section.bulletsEn;
              return (
                <section key={section.id} id={section.id}>
                  <h2>{ar ? section.titleAr : section.titleEn}</h2>
                  {paragraphs.map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                  {bullets && bullets.length > 0 && (
                    <ul>
                      {bullets.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}

            <aside className="legal-contact">
              <Icon name="shield" size={22} />
              <div>
                <b>
                  {ar
                    ? "هل لديك سؤال أو طلب يتعلق ببياناتك؟"
                    : "Do you have a question or a data request?"}
                </b>
                <p>
                  {ar
                    ? "فريق الدعم يجيب خلال ٥ أيام عمل. لا نطلب أبدًا كلمة المرور أو رمز التحقق."
                    : "Our support team replies within 5 business days. We never ask for your password or verification code."}
                </p>
                <a href="mailto:support@sharik-alomr.com">
                  support@sharik-alomr.com
                </a>
              </div>
            </aside>
          </article>
        </section>
      </main>

      <footer className="legal-footer">
        <div className="container">
          <span>
            © 2026 Sharik Alomr.{" "}
            {ar ? "جميع الحقوق محفوظة." : "All rights reserved."}
          </span>
          <span>
            {ar
              ? "صُنع باحترام لكل بداية جادة"
              : "Made with respect for every serious beginning"}
          </span>
        </div>
      </footer>
    </div>
  );
}
