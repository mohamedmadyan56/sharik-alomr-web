import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  Button,
  Icon,
  Logo,
  PreferenceControls,
  SectionTitle,
  type BlogArticle,
  type IconName,
  type Language,
  type PlanConfig,
  type Theme,
  steps,
  trustItems,
} from "../app-shared"

function useReveal<T extends HTMLElement>(threshold = 0.12) {
  const ref = useRef<T | null>(null)
  const [state, setState] = useState<"idle" | "hidden" | "shown">("idle")

  useEffect(() => {
    const element = ref.current
    if (!element || typeof IntersectionObserver === "undefined") return
    setState("hidden")
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setState("shown")
          observer.disconnect()
        }
      },
      { threshold, rootMargin: "0px 0px -8% 0px" },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [threshold])

  return { ref, state }
}

export function HomePage({
  go,
  language,
  plans,
  articles,
  articlesLoading,
  articlesError,
  theme,
  setLanguage,
  setTheme,
}: {
  go: (v: string) => void
  language: Language
  plans: PlanConfig[]
  articles: BlogArticle[]
  articlesLoading?: boolean
  articlesError?: string | null
  theme: Theme
  setLanguage: (language: Language) => void
  setTheme: (theme: Theme) => void
}) {
  const ar = language === "ar"
  const [openFaq, setOpenFaq] = useState(0)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const packagesReveal = useReveal<HTMLElement>()
  const localizedTrust = ar
    ? trustItems
    : [
        [
          "shield",
          "Verified profiles",
          "Accounts are reviewed carefully to build a more intentional community.",
        ],
        [
          "lock",
          "Privacy by design",
          "You decide what appears, to whom, and at what time.",
        ],
        [
          "sparkles",
          "Thoughtful matches",
          "Recommendations based on marriage goals and shared compatibility.",
        ],
        [
          "heart",
          "Mutual acceptance",
          "Private messaging begins only after both people agree.",
        ],
      ] as const
  const localizedSteps = ar
    ? steps
    : [
        [
          "01",
          "Create your profile",
          "Tell us about yourself and what you are looking for.",
        ],
        [
          "02",
          "Set your preferences",
          "Choose the values and qualities that matter most to you.",
        ],
        [
          "03",
          "Explore recommendations",
          "Review selected profiles aligned with your preferences.",
        ],
        [
          "04",
          "Connect respectfully",
          "After mutual acceptance, start a conversation in a safe space.",
        ],
      ] as const
  const faqs = ar
    ? [
        [
          "كيف تحافظ المنصة على خصوصيتي؟",
          "نوفر تحكمًا واضحًا في ظهور الصور والمعلومات، ولا نعرض بيانات الاتصال أو الموقع الدقيق لأي عضو.",
        ],
        [
          "هل المنصة مخصصة للزواج الجاد فقط؟",
          "نعم، صُممت شريك العمر لمن يبحثون عن ارتباط رسمي بنية واضحة ومحترمة.",
        ],
        [
          "متى يمكنني إرسال رسالة؟",
          "يتاح التواصل الخاص فقط بعد قبول الاهتمام من الطرف الآخر ووجود تطابق متبادل.",
        ],
        [
          "هل يمكن إشراك الأسرة؟",
          "نعم، تتوفر خيارات اختيارية لمشاركة خطوات التعارف مع أحد أفراد الأسرة وفق رغبتك.",
        ],
      ]
    : [
        [
          "How does Sharik Alomr protect my privacy?",
          "You control the visibility of your photos and information. Contact details and precise location are never public.",
        ],
        [
          "Is the platform only for serious marriage?",
          "Yes. Sharik Alomr is designed for people seeking a clear, respectful path to marriage.",
        ],
        [
          "When can I send a message?",
          "Private messaging is available only after mutual interest is accepted.",
        ],
        [
          "Can my family be involved?",
          "Yes. Optional tools let you include a family member in the journey whenever you choose.",
        ],
      ]
  return (
    <div className="landing">
      <header className="public-header">
        <div className="container header-inner">
          <Logo language={language} />
          <PreferenceControls
            language={language}
            theme={theme}
            setLanguage={setLanguage}
            setTheme={setTheme}
            className="header-preference-controls"
          />
          <nav
            className={`public-nav ${mobileNavOpen ? "open" : ""}`}
            aria-label={ar ? "التنقل الرئيسي" : "Main navigation"}
          >
            <a
              href="#home"
              className="active"
              onClick={() => setMobileNavOpen(false)}
            >
              {ar ? "الرئيسية" : "Home"}
            </a>
            <a href="#how" onClick={() => setMobileNavOpen(false)}>
              {ar ? "كيف تعمل؟" : "How it works"}
            </a>
            <a href="#about" onClick={() => setMobileNavOpen(false)}>
              {ar ? "من نحن" : "About us"}
            </a>
            <a href="#packages" onClick={() => setMobileNavOpen(false)}>
              {ar ? "الباقات" : "Plans"}
            </a>
            <a href="#safety" onClick={() => setMobileNavOpen(false)}>
              {ar ? "الأمان" : "Safety"}
            </a>
            <a href="#blog" onClick={() => setMobileNavOpen(false)}>
              {ar ? "المدونة" : "Blog"}
            </a>
            <a href="#faq" onClick={() => setMobileNavOpen(false)}>
              {ar ? "الأسئلة الشائعة" : "FAQ"}
            </a>
          </nav>
          <div className="header-actions">
            <button className="text-button" onClick={() => go("login")}>
              {ar ? "تسجيل الدخول" : "Sign in"}
            </button>
            <Button onClick={() => go("onboarding")}>
              {ar ? "ابدأ رحلتك" : "Start your journey"}
            </Button>
          </div>
          <button
            className="mobile-menu"
            aria-label={
              mobileNavOpen
                ? ar
                  ? "إغلاق القائمة"
                  : "Close menu"
                : ar
                  ? "فتح القائمة"
                  : "Open menu"
            }
            aria-expanded={mobileNavOpen}
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
          >
            <Icon name="menu" />
          </button>
        </div>
      </header>

      <main>
        <section className="hero" id="home">
          <div className="hero-orbit orbit-one" />
          <div className="container hero-grid">
            <div className="hero-copy">
              <div className="eyebrow">
                <Icon name="shield" size={16} />{" "}
                {ar
                  ? "مساحة آمنة لعلاقة جادة"
                  : "A safe space for a serious relationship"}
              </div>
              <h1>
                {ar ? "رحلتك نحو" : "Your journey to"}
                <br />
                <em>{ar ? "شريك العمر" : "a life partner"}</em>
                <br />
                {ar ? "تبدأ من هنا" : "starts here"}
              </h1>
              <p>
                {ar
                  ? "منصة زواج مصرية تساعدك على التعارف الجاد من خلال ترشيحات مدروسة، وخصوصية حقيقية، وخطوات تحترم قيمك."
                  : "An Egyptian marriage platform for intentional connections, thoughtful recommendations, real privacy, and a journey that respects your values."}
              </p>
              <div className="hero-actions">
                <Button onClick={() => go("onboarding")} icon="arrow">
                  {ar ? "ابدأ الآن" : "Get started"}
                </Button>
                <Button
                  kind="ghost"
                  onClick={() =>
                    document
                      .getElementById("how")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  {ar ? "اكتشف كيف تعمل المنصة" : "See how it works"}
                </Button>
              </div>
              <div className="hero-note">
                <span className="avatars">
                  <i />
                  <i />
                  <i />
                </span>
                <span>
                  <b>{ar ? "خصوصية أولًا" : "Privacy first"}</b>{" "}
                  {ar
                    ? "رحلة اختيار واعية بخطوات واضحة"
                    : "a thoughtful journey with clear steps"}
                  <small>
                    {ar
                      ? "تحقق يدوي واحترام كامل للحدود"
                      : "manual verification and clear boundaries"}
                  </small>
                </span>
              </div>
            </div>
            <div className="hero-visual">
              <div className="photo-wrap">
                <div className="photo-frame">
                  <img
                    src="/images/hero-couple.jpg"
                    alt={
                      ar
                        ? "عروسان في مسجد بأجواء هادئة"
                        : "A bride and groom in a serene mosque setting"
                    }
                    width={860}
                    height={1292}
                    fetchPriority="high"
                    decoding="async"
                  />
                  <div className="photo-overlay">
                    <div className="photo-caption">
                      <span className="photo-kicker">
                        <Icon name="heart" size={12} />
                        {ar ? "القيم أولاً" : "Values first"}
                      </span>
                      <b>
                        {ar
                          ? "توافق يبدأ بالقيم"
                          : "Compatibility starts with values"}
                      </b>
                      <small>
                        {ar
                          ? "اهتمامات وأهداف مشتركة"
                          : "Shared interests • clear goals"}
                      </small>
                    </div>
                  </div>
                </div>
                <div className="floating-card verified">
                  <span>
                    <Icon name="check" size={16} />
                  </span>
                  <div>
                    <b>{ar ? "حساب موثّق" : "Verified account"}</b>
                    <small>
                      {ar
                        ? "تأكيد الهوية اختياري"
                        : "Optional phone and ID checks"}
                    </small>
                  </div>
                </div>
                <div className="privacy-pill">
                  <span>
                    <Icon name="lock" size={15} />
                  </span>
                  <div>
                    <b>
                      {ar ? "خصوصيتك أولويتنا" : "Your privacy comes first"}
                    </b>
                    <small>
                      {ar
                        ? "تحكم كامل في ما يظهر"
                        : "You control visibility"}
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="trust-strip">
          <div className="container trust-grid">
            {localizedTrust.map(([icon, title, text]) => (
              <article key={title}>
                <span>
                  <Icon name={icon} />
                </span>
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="section how" id="how">
          <div className="container">
            <SectionTitle
              kicker={ar ? "خطوات بسيطة ومدروسة" : "Simple, thoughtful steps"}
              title={
                ar
                  ? "من التعارف إلى بداية جادة"
                  : "From discovery to a serious beginning"
              }
              text={
                ar
                  ? "صممنا كل خطوة لتكون واضحة ومطمئنة، دون ضغط أو تسرع."
                  : "Every step is designed to feel clear and reassuring, without pressure or rush."
              }
            />
            <div className="steps">
              {localizedSteps.map(([num, title, text], i) => (
                <article key={num}>
                  <div className="step-icon">
                    {i === 0 ? (
                      <Icon name="user" />
                    ) : i === 1 ? (
                      <Icon name="sliders" />
                    ) : i === 2 ? (
                      <Icon name="sparkles" />
                    ) : (
                      <Icon name="heart" />
                    )}
                    <b>{num}</b>
                  </div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section about-section" id="about">
          <div className="container about-grid">
            <div className="about-copy">
              <SectionTitle
                kicker={ar ? "من نحن" : "About us"}
                title={
                  ar
                    ? "نؤمن أن بداية العمر تستحق اختيارًا واعيًا"
                    : "A lifelong partnership deserves a thoughtful beginning"
                }
                text={
                  ar
                    ? "شريك العمر منصة مصرية للتعارف الجاد، تساعدك على اكتشاف التوافق الحقيقي بخطوات واضحة ومساحة آمنة تحترم خصوصيتك وقيمك."
                    : "Sharik Alomr is an Egyptian platform for intentional connections, helping you explore meaningful compatibility through clear steps and a safe space that respects your privacy and values."
                }
              />
              <a className="inline-link" href="#safety">
                {ar
                  ? "اكتشف التزامنا بالأمان"
                  : "Explore our commitment to safety"}{" "}
                <Icon name="arrow" size={17} />
              </a>
            </div>
            <div className="about-values">
              <article>
                <span>
                  <Icon name="heart" />
                </span>
                <div>
                  <b>{ar ? "نية جادة" : "Intentional connections"}</b>
                  <p>
                    {ar
                      ? "نساعدك على التعارف بهدف واضح وتوقعات صريحة."
                      : "Meet with a clear purpose and honest expectations."}
                  </p>
                </div>
              </article>
              <article>
                <span>
                  <Icon name="lock" />
                </span>
                <div>
                  <b>{ar ? "خصوصيتك أولًا" : "Your privacy comes first"}</b>
                  <p>
                    {ar
                      ? "تتحكم في معلوماتك وتختار ما تشاركه ومتى."
                      : "You stay in control of what you share and when."}
                  </p>
                </div>
              </article>
              <article>
                <span>
                  <Icon name="users" />
                </span>
                <div>
                  <b>
                    {ar
                      ? "توافق ينمو باحترام"
                      : "Compatibility built on respect"}
                  </b>
                  <p>
                    {ar
                      ? "نؤمن أن الحوار الهادئ والقيم المشتركة أساس الاختيار."
                      : "We believe thoughtful dialogue and shared values make a strong foundation."}
                  </p>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section
          className="section packages-section"
          id="packages"
          ref={packagesReveal.ref}
          data-reveal={packagesReveal.state}
        >
          <div className="container">
            <SectionTitle
              kicker={
                ar ? "اختر ما يناسب رحلتك" : "Choose what fits your journey"
              }
              title={
                ar ? "باقات واضحة بدون مفاجآت" : "Simple plans, no surprises"
              }
              text={
                ar
                  ? "كل أدوات الأمان والخصوصية متاحة للجميع، والباقات المدفوعة تمنحك مرونة أكبر فقط."
                  : "Safety and privacy tools are available to everyone. Paid plans only add more flexibility."
              }
            />
            <div className="landing-plans">
              {plans
                .filter((plan) => plan.active)
                .map((plan) => {
                  const featured = plan.featured ?? plan.tier === "gold"
                  const icon: IconName =
                    plan.tier === "gold" || plan.id === "premium"
                      ? "sparkles"
                      : plan.tier === "platinum" || plan.id === "family"
                        ? "users"
                        : "heart"
                  const tagline = ar
                    ? plan.descriptionAr ??
                      (plan.tier === "platinum"
                        ? "تجربة كاملة بمزايا أولوية"
                        : plan.tier === "gold"
                          ? "مزايا أكثر لرحلة متكاملة"
                          : "بداية هادئة للتعارف الجاد")
                    : plan.descriptionEn ??
                      (plan.tier === "platinum"
                        ? "The complete priority experience"
                        : plan.tier === "gold"
                          ? "More tools for a complete journey"
                          : "A calm start to intentional connections")
                  return (
                    <article
                      className={featured ? "featured" : ""}
                      key={plan.id}
                    >
                      {featured && (
                        <b className="plan-ribbon">
                          <Icon name="sparkles" size={12} />
                          {ar ? "الأكثر اختيارًا" : "Most popular"}
                        </b>
                      )}
                      <div className="plan-head">
                        <span className="plan-icon">
                          <Icon name={icon} size={19} />
                        </span>
                        <div>
                          <h3 className="plan-name">
                            {ar ? plan.nameAr : plan.nameEn}
                          </h3>
                          <p className="plan-tagline">{tagline}</p>
                        </div>
                      </div>
                      <div className="plan-price">
                        <b>
                          {plan.price === 0
                            ? ar
                              ? "مجانًا"
                              : "Free"
                            : plan.price.toLocaleString("en-US")}
                        </b>
                        <small>
                          {plan.price === 0
                            ? ar
                              ? "للأبد"
                              : "forever"
                            : ar
                              ? `${plan.currency} / شهريًا`
                              : `${plan.currency} / month`}
                        </small>
                      </div>
                      <span className="plan-includes">
                        {ar ? "ما تحصل عليه" : "What's included"}
                      </span>
                      <ul>
                        {(ar ? plan.featuresAr : plan.featuresEn).map((x) => (
                          <li key={x}>
                            <Icon name="check" size={16} />
                            {x}
                          </li>
                        ))}
                      </ul>
                      <Button
                        kind={featured ? "primary" : "outline"}
                        onClick={() =>
                          go(plan.price === 0 ? "onboarding" : "pricing")
                        }
                      >
                        {plan.price === 0
                          ? ar
                            ? "ابدأ مجانًا"
                            : "Start free"
                          : ar
                            ? "اختيار الباقة"
                            : "Choose plan"}
                      </Button>
                    </article>
                  )
                })}
            </div>
            <div className="plans-foot">
              <span>
                <Icon name="shield" size={16} />
                {ar
                  ? "الأمان والخصوصية متاحان في كل الباقات"
                  : "Safety and privacy in every plan"}
              </span>
              <button onClick={() => go("pricing")}>
                {ar ? "قارن كل المزايا" : "Compare all features"}
                <Icon name="arrow" size={15} />
              </button>
            </div>
            {/* <div className="packages-note"><Icon name="shield"/><span><b>{ar?"الأمان ليس باقة مدفوعة":"Safety is never a paid feature"}</b><small>{ar?"الحظر والإبلاغ والتحقق وحماية الحساب متاحة لكل مستخدم.":"Blocking, reporting, verification, and account protection are available to every user."}</small></span><button onClick={()=>go("pricing")}>{ar?"مقارنة كل المزايا":"Compare all features"} <Icon name="arrow" size={16}/></button></div> */}
          </div>
        </section>

        <section className="section safety" id="safety">
          <div className="container safety-grid">
            <div className="safety-art">
              <img
                className="safety-photo"
                src="https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=1080&q=85"
                alt={
                  ar
                    ? "يدان ترسمان شكل قلب في لحظة تعبّر عن المودة والثقة"
                    : "Hands forming a heart shape in a moment of affection and trust"
                }
              />
              <span className="safety-shield" aria-hidden="true">
                <Icon name="shield" size={24} />
              </span>
            </div>
            <div>
              <SectionTitle
                kicker={
                  ar ? "الأمان ليس ميزة إضافية" : "Safety is not an add-on"
                }
                title={
                  ar
                    ? "مساحة تحترم خصوصيتك وكرامتك"
                    : "A space that respects your privacy and dignity"
                }
                text={
                  ar
                    ? "نضع معايير الأمان والوضوح في قلب كل قرار، ونمنحك أدوات كاملة للتحكم في تجربتك."
                    : "We put safety and clarity at the heart of every decision, with complete tools to control your experience."
                }
              />
              <ul className="check-list">
                <li>
                  <Icon name="check" />{" "}
                  {ar
                    ? "تحكم كامل في ظهور صورك ومعلوماتك"
                    : "Full control over your photos and information"}
                </li>
                <li>
                  <Icon name="check" />{" "}
                  {ar
                    ? "الإبلاغ والحظر متاحان في كل ملف ومحادثة"
                    : "Reporting and blocking are available on every profile and conversation"}
                </li>
                <li>
                  <Icon name="check" />{" "}
                  {ar
                    ? "لا تظهر بيانات الاتصال أو الموقع الدقيق"
                    : "Contact details and precise location are never shown"}
                </li>
                <li>
                  <Icon name="check" />{" "}
                  {ar
                    ? "تذكيرات مستمرة بمبادئ التواصل الآمن"
                    : "Ongoing reminders about safe communication"}
                </li>
              </ul>
              <button className="inline-link">
                {ar ? "تعرّف على إرشادات الأمان" : "Explore safety guidance"}{" "}
                <Icon name="arrow" size={17} />
              </button>
            </div>
          </div>
        </section>

        <section className="section testimony">
          <div className="container">
            <SectionTitle
              kicker={ar ? "قيمنا في كل خطوة" : "Our values in every step"}
              title={
                ar
                  ? "الثقة تبدأ بتجربة إنسانية"
                  : "Trust begins with a human experience"
              }
            />
            <div className="quote-card">
              <span className="quote-mark">“</span>
              <p>
                {ar
                  ? "أكثر ما أعجبني هو هدوء التجربة ووضوح الخطوات. شعرت أن كل شيء مصمم بجدية واحترام، وليس لمجرد جمع أكبر عدد من المحادثات."
                  : "What I liked most was the calm experience and clear steps. Everything felt designed with care and respect, not just to collect as many conversations as possible."}
              </p>
              <div>
                <b>{ar ? "مبدأ شريك العمر" : "The Sharik Alomr principle"}</b>
                <small>
                  {ar
                    ? "هدوء ووضوح واحترام في كل خطوة"
                    : "Calm, clarity, and respect at every step"}
                </small>
              </div>
            </div>
          </div>
        </section>

        <section className="section blog-section" id="blog">
          <div className="container">
            <div className="section-heading-row">
              <SectionTitle
                kicker={ar ? "مجلة شريك العمر" : "Sharik Alomr journal"}
                title={
                  ar
                    ? "معرفة تساعدك على اختيار واعٍ"
                    : "Guidance for thoughtful choices"
                }
                text={
                  ar
                    ? "مقالات تثقيفية عن الاستعداد للزواج والتواصل والحدود الصحية."
                    : "Practical articles about marriage readiness, communication, and healthy boundaries."
                }
              />
              <Button
                kind="outline"
                icon="arrow"
                onClick={() => go("articles")}
              >
                {ar ? "عرض كل المقالات" : "View all articles"}
              </Button>
            </div>
            {articles.length > 0 ? (
              <div className="blog-grid">
                {articles.slice(0, 3).map((article) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    language={language}
                    onOpen={() => go(`article:${article.id}`)}
                  />
                ))}
              </div>
            ) : (
              <div className="articles-empty-inline" role="status">
                <Icon name="book" size={22} />
                <span>
                  {articlesLoading
                    ? ar
                      ? "جارٍ تحميل المقالات..."
                      : "Loading articles..."
                    : articlesError
                      ? articlesError
                      : ar
                        ? "لا توجد مقالات منشورة بعد."
                        : "No published articles yet."}
                </span>
              </div>
            )}
            <p className="articles-note">
              {ar
                ? "مقالات منشورة من فريق تحرير شريك العمر."
                : "Articles published by the Sharik Alomr editorial team."}
            </p>
          </div>
        </section>

        <section className="section faq" id="faq">
          <div className="container faq-grid">
            <SectionTitle
              kicker={ar ? "أسئلة شائعة" : "Frequently asked questions"}
              title={
                ar
                  ? "إجابات واضحة قبل أن تبدأ"
                  : "Clear answers before you begin"
              }
              text={
                ar
                  ? "لم تجد ما تبحث عنه؟ تواصل مع فريق الدعم وسنساعدك بكل احترام."
                  : "Didn't find what you were looking for? Contact our support team and we will help respectfully."
              }
            />
            <div>
              {faqs.map(([q, a], i) => (
                <div
                  className={`faq-item ${openFaq === i ? "open" : ""}`}
                  key={q}
                >
                  <button onClick={() => setOpenFaq(openFaq === i ? -1 : i)}>
                    <span>{q}</span>
                    <b>{openFaq === i ? "−" : "+"}</b>
                  </button>
                  {openFaq === i && <p>{a}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="final-cta">
          <div className="container">
            <div className="cta-inner">
              <span className="cta-icon">
                <Icon name="heart" size={35} />
              </span>
              <div>
                <h2>
                  {ar
                    ? "ربما تكون خطوتك الأولى هي الأهم"
                    : "Your first step may be the most important"}
                </h2>
                <p>
                  {ar
                    ? "انضم إلى مجتمع يبحث عن علاقة جادة، بقيم واضحة وخصوصية تستحقها."
                    : "Join a community seeking a serious relationship, with clear values and the privacy you deserve."}
                </p>
              </div>
              <Button
                kind="light"
                onClick={() => go("onboarding")}
                icon="arrow"
              >
                {ar ? "أنشئ حسابك مجانًا" : "Create your free account"}
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer go={go} language={language} />
    </div>
  )
}

function ArticleCard({
  article,
  language,
  onOpen,
}: {
  article: BlogArticle
  language: Language
  onOpen: () => void
}) {
  const ar = language === "ar"
  return (
    <article>
      <img src={article.image} alt={ar ? article.titleAr : article.titleEn} />
      <div>
        <span>{ar ? article.categoryAr : article.categoryEn}</span>
        <h3>{ar ? article.titleAr : article.titleEn}</h3>
        <p>{ar ? article.excerptAr : article.excerptEn}</p>
        <footer>
          <small>{ar ? article.timeAr : article.timeEn}</small>
          <button
            onClick={onOpen}
            aria-label={
              ar
                ? `اقرأ المقال: ${article.titleAr}`
                : `Read article: ${article.titleEn}`
            }
          >
            {ar ? "اقرأ المقال" : "Read article"}
            <Icon name="arrow" size={16} />
          </button>
        </footer>
      </div>
    </article>
  )
}

export function ArticlesPage({
  go,
  language,
  articles,
  loading = false,
  error = null,
}: {
  go: (view: string) => void
  language: Language
  articles: BlogArticle[]
  loading?: boolean
  error?: string | null
}) {
  const ar = language === "ar"
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("all")
  const categories = [
    ...new Set(
      articles.map((article) =>
        ar ? article.categoryAr : article.categoryEn,
      ),
    ),
  ]
  const filteredArticles = articles.filter((article) => {
    const title = ar ? article.titleAr : article.titleEn
    const excerpt = ar ? article.excerptAr : article.excerptEn
    const articleCategory = ar ? article.categoryAr : article.categoryEn
    return (
      (category === "all" || articleCategory === category) &&
      `${title} ${excerpt} ${articleCategory}`
        .toLocaleLowerCase()
        .includes(query.trim().toLocaleLowerCase())
    )
  })
  return (
    <div className="articles-page">
      <header className="public-header">
        <div className="container header-inner">
          <Logo language={language} />
          <Button kind="outline" icon="arrow" onClick={() => go("landing")}>
            {ar ? "العودة للرئيسية" : "Back to home"}
          </Button>
        </div>
      </header>
      <main>
        <section className="articles-hero">
          <div className="container">
            <span className="eyebrow">
              <Icon name="book" size={16} />
              {ar ? "مجلة شريك العمر" : "Sharik Alomr journal"}
            </span>
            <h1>{ar ? "كل المقالات" : "All articles"}</h1>
            <p>
              {ar
                ? "مساحة للمعرفة والإجابات الهادئة حول الاستعداد للزواج والتواصل وبناء علاقة صحية."
                : "Thoughtful guidance on marriage readiness, communication, and building a healthy relationship."}
            </p>
          </div>
        </section>
        <section className="section articles-content">
          <div className="container">
            <div className="articles-toolbar">
              <label className="articles-search">
                <Icon name="search" size={19} />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={
                    ar ? "ابحث في المقالات..." : "Search articles..."
                  }
                />
              </label>
              <div
                className="articles-categories"
                aria-label={ar ? "تصنيفات المقالات" : "Article categories"}
              >
                <button
                  className={category === "all" ? "active" : ""}
                  onClick={() => setCategory("all")}
                >
                  {ar ? "الكل" : "All"}
                </button>
                {categories.map((item) => (
                  <button
                    className={category === item ? "active" : ""}
                    key={item}
                    onClick={() => setCategory(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
            {loading && articles.length === 0 ? (
              <div className="articles-empty" role="status">
                <Icon name="book" size={28} />
                <h2>{ar ? "جارٍ تحميل المقالات" : "Loading articles"}</h2>
                <p>
                  {ar
                    ? "لحظات ونجهّز لك أحدث المقالات."
                    : "We are preparing the latest articles for you."}
                </p>
              </div>
            ) : error && articles.length === 0 ? (
              <div className="articles-empty" role="alert">
                <Icon name="shield" size={28} />
                <h2>{ar ? "تعذّر تحميل المقالات" : "Could not load articles"}</h2>
                <p>{error}</p>
              </div>
            ) : filteredArticles.length > 0 ? (
              <div className="blog-grid articles-grid">
                {filteredArticles.map((article) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    language={language}
                    onOpen={() => go(`article:${article.id}`)}
                  />
                ))}
              </div>
            ) : (
              <div className="articles-empty">
                <Icon name="search" size={28} />
                <h2>{ar ? "لم نعثر على مقالات" : "No articles found"}</h2>
                <p>
                  {ar
                    ? "جرّب كلمة بحث أو تصنيفًا مختلفًا."
                    : "Try a different search term or category."}
                </p>
                <button
                  onClick={() => {
                    setQuery("")
                    setCategory("all")
                  }}
                >
                  {ar ? "عرض كل المقالات" : "Show all articles"}
                </button>
              </div>
            )}
            <p className="articles-note">
              {ar
                ? "مقالات منشورة من فريق تحرير شريك العمر."
                : "Articles published by the Sharik Alomr editorial team."}
            </p>
          </div>
        </section>
      </main>
      <Footer go={go} language={language} />
    </div>
  )
}

export function ArticleDetail({
  article,
  go,
  language,
}: {
  article: BlogArticle
  go: (view: string) => void
  language: Language
}) {
  const ar = language === "ar"
  const title = ar ? article.titleAr : article.titleEn
  const paragraphs = ar ? article.bodyAr : article.bodyEn
  return (
    <div className="article-detail-page">
      <header className="public-header">
        <div className="container header-inner">
          <Logo language={language} />
          <Button kind="outline" icon="arrow" onClick={() => go("articles")}>
            {ar ? "كل المقالات" : "All articles"}
          </Button>
        </div>
      </header>
      <main>
        <article className="article-detail container">
          <div className="article-breadcrumb">
            <button onClick={() => go("landing")}>
              {ar ? "الرئيسية" : "Home"}
            </button>
            <Icon name="arrow" size={14} />
            <button onClick={() => go("articles")}>
              {ar ? "المقالات" : "Articles"}
            </button>
            <Icon name="arrow" size={14} />
            <span>{ar ? article.categoryAr : article.categoryEn}</span>
          </div>
          <header className="article-detail-heading">
            <span className="article-category">
              {ar ? article.categoryAr : article.categoryEn}
            </span>
            <h1>{title}</h1>
            <p>{ar ? article.excerptAr : article.excerptEn}</p>
            <div className="article-meta">
              <span>
                <Icon name="clock" size={16} />
                {ar ? article.timeAr : article.timeEn}
              </span>
              <span>{ar ? "مجلة شريك العمر" : "Sharik Alomr journal"}</span>
            </div>
          </header>
          <img className="article-cover" src={article.image} alt={title} />
          <div className="article-body">
            {paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
            <aside>
              <Icon name="heart" size={20} />
              <span>
                {ar
                  ? "خذ وقتك في التفكير، فكل بداية جادة تستحق الوضوح والاحترام."
                  : "Take the time you need. Every serious beginning deserves clarity and respect."}
              </span>
            </aside>
          </div>
          <footer className="article-detail-footer">
            <span>
              {ar ? "هل ترغب في قراءة المزيد؟" : "Would you like to read more?"}
            </span>
            <Button kind="outline" icon="arrow" onClick={() => go("articles")}>
              {ar ? "تصفّح كل المقالات" : "Browse all articles"}
            </Button>
          </footer>
        </article>
      </main>
      <Footer go={go} language={language} />
    </div>
  )
}

function Footer({
  go,
  language,
}: {
  go: (v: string) => void
  language: Language
}) {
  const ar = language === "ar"
  return (
    <footer>
      <div className="container footer-grid">
        <div>
          <Logo light language={language} />
          <p>
            {ar
              ? "منصة عربية للزواج الجاد، تجمع بين التكنولوجيا الحديثة والقيم التي تحترم الإنسان والأسرة."
              : "An Arabic platform for serious marriage, combining modern technology with values that respect people and family."}
          </p>
        </div>
        <div>
          <h4>{ar ? "المنصة" : "Platform"}</h4>
          <Link href="/legal/about">{ar ? "عن شريك العمر" : "About us"}</Link>
          <a href="#how">{ar ? "كيف تعمل؟" : "How it works"}</a>
          <button className="footer-link" onClick={() => go("pricing")}>
            {ar ? "الأسعار" : "Pricing"}
          </button>
          <Link href="/legal/about#contact">
            {ar ? "تواصل معنا" : "Contact us"}
          </Link>
        </div>
        <div>
          <h4>{ar ? "الأمان والثقة" : "Safety & trust"}</h4>
          <Link href="/legal/privacy">
            {ar ? "سياسة الخصوصية" : "Privacy policy"}
          </Link>
          <Link href="/legal/terms">
            {ar ? "شروط الاستخدام" : "Terms of use"}
          </Link>
          <Link href="/legal/refund">
            {ar ? "سياسة الاسترداد" : "Refund policy"}
          </Link>
          <Link href="/legal/safety">
            {ar ? "إرشادات الأمان" : "Safety guide"}
          </Link>
          <button
            className="footer-link"
            onClick={() =>
              window.dispatchEvent(new Event("sharik:cookie-settings"))
            }
          >
            {ar ? "إعدادات الكوكيز" : "Cookie settings"}
          </button>
          <Link href="/admin/login">{ar ? "دخول الإدارة" : "Admin sign in"}</Link>
        </div>
        <div>
          <h4>{ar ? "ابقَ على تواصل" : "Stay connected"}</h4>
          <p>
            {ar
              ? "فريق الدعم متاح لمساعدتك يوميًا."
              : "Our support team is available every day."}
          </p>
          <button className="language">
            {ar ? "العربية" : "English"} <span>⌄</span>
          </button>
        </div>
      </div>
      <div className="container copyright">
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
  )
}

export function Pricing({
  back,
  start,
  plans,
  language,
}: {
  back: () => void
  start: () => void
  plans: PlanConfig[]
  language: Language
}) {
  const ar = language === "ar"
  const [annual, setAnnual] = useState(true)
  const savings = plans.find((plan) => plan.price > 0)?.annualSavingsPercent ?? 17
  return (
    <div className="simple-page" dir={ar ? "rtl" : "ltr"}>
      <header>
        <Logo language={language} />
        <button onClick={back}>
          {ar ? "العودة للرئيسية" : "Back to home"}
        </button>
      </header>
      <main className="container pricing-main">
        <SectionTitle
          kicker={ar ? "باقات بسيطة وواضحة" : "Simple, clear plans"}
          title={ar ? "خطة واضحة دون مفاجآت" : "Clear pricing, no surprises"}
          text={
            ar
              ? "كل أدوات الأمان والتحكم في الحساب متاحة للجميع. الترقية تمنحك مزايا إضافية فقط."
              : "All safety and account control tools are available to everyone. Upgrades only add extra features."
          }
        />
        <div className="billing-toggle">
          <button
            className={!annual ? "active" : ""}
            onClick={() => setAnnual(false)}
          >
            {ar ? "شهري" : "Monthly"}
          </button>
          <button
            className={annual ? "active" : ""}
            onClick={() => setAnnual(true)}
          >
            {ar ? "سنوي" : "Annual"}{" "}
            <span>
              {ar ? `وفر ${savings}%` : `Save ${savings}%`}
            </span>
          </button>
        </div>
        <div className="landing-plans pricing-plans">
          {plans
            .filter((plan) => plan.active)
            .map((plan) => {
              const featured = plan.featured ?? plan.tier === "gold"
              const icon: IconName =
                plan.tier === "gold" || plan.id === "premium"
                  ? "sparkles"
                  : plan.tier === "platinum" || plan.id === "family"
                    ? "users"
                    : "heart"
              const tagline = ar
                ? plan.descriptionAr ??
                  (plan.tier === "platinum"
                    ? "تجربة كاملة بمزايا أولوية"
                    : plan.tier === "gold"
                      ? "مزايا أكثر لرحلة متكاملة"
                      : "بداية هادئة للتعارف الجاد")
                : plan.descriptionEn ??
                  (plan.tier === "platinum"
                    ? "The complete priority experience"
                    : plan.tier === "gold"
                      ? "More tools for a complete journey"
                      : "A calm start to intentional connections")
              const shownPrice =
                annual && plan.price > 0
                  ? plan.annualPrice ?? plan.price * 10
                  : plan.price
              return (
                <article className={featured ? "featured" : ""} key={plan.id}>
                  {featured && (
                    <b className="plan-ribbon">
                      <Icon name="sparkles" size={12} />
                      {ar ? "الأكثر اختيارًا" : "Most popular"}
                    </b>
                  )}
                  <div className="plan-head">
                    <span className="plan-icon">
                      <Icon name={icon} size={19} />
                    </span>
                    <div>
                      <h3 className="plan-name">
                        {ar ? plan.nameAr : plan.nameEn}
                      </h3>
                      <p className="plan-tagline">{tagline}</p>
                    </div>
                  </div>
                  <div className="plan-price">
                    <b>{shownPrice.toLocaleString("en-US")}</b>
                    <small>
                      {plan.price === 0
                        ? ar
                          ? "للأبد"
                          : "forever"
                        : `${plan.currency} / ${
                            annual
                              ? ar
                                ? "سنويًا"
                                : "year"
                              : ar
                                ? "شهريًا"
                                : "month"
                          }`}
                    </small>
                  </div>
                  <span className="plan-includes">
                    {ar ? "ما تحصل عليه" : "What's included"}
                  </span>
                  <ul>
                    {(ar ? plan.featuresAr : plan.featuresEn).map((x) => (
                      <li key={x}>
                        <Icon name="check" size={16} />
                        {x}
                      </li>
                    ))}
                  </ul>
                  <Button
                    kind={featured ? "primary" : "outline"}
                    onClick={start}
                  >
                    {plan.price === 0
                      ? ar
                        ? "ابدأ مجانًا"
                        : "Start free"
                      : ar
                        ? "اختيار الباقة"
                        : "Choose plan"}
                  </Button>
                  <small className="plan-note">
                    {plan.price === 0
                      ? ar
                        ? "للأبد"
                        : "forever"
                      : annual
                        ? ar
                          ? "تُدفع سنويًا"
                          : "billed annually"
                        : ar
                          ? "تُدفع شهريًا"
                          : "billed monthly"}
                  </small>
                </article>
              )
            })}
        </div>
        <div className="pricing-note">
          <Icon name="shield" />
          <span>
            <b>{ar ? "الأمان حق للجميع" : "Safety is a right for everyone"}</b>
            <small>
              {ar
                ? "الحظر والإبلاغ والتحقق وأدوات حماية الحساب ليست مرتبطة بأي اشتراك مدفوع."
                : "Blocking, reporting, verification, and account protection are not tied to any paid subscription."}
            </small>
          </span>
        </div>
      </main>
    </div>
  )
}
