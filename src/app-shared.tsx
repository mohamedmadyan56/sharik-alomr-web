import type React from "react"
import logoImage from "./images/Sharik-Alomr-logo.png"

export type IconName = "home" | "heart" | "search" | "chat" | "bell" | "user" | "settings" | "shield" | "check" | "arrow" | "menu" | "sliders" | "lock" | "sparkles" | "clock" | "book" | "briefcase" | "location" | "globe" | "sun" | "moon" | "users" | "wallet" | "phone" | "video" | "send"

const paths: Record<IconName, React.ReactNode> = {
  home: (
    <>
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v10h14V10M9 20v-6h6v6" />
    </>
  ),
  heart: (
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.7-7.5 1.1-1.1a5.5 5.5 0 0 0 0-7.8Z" />
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </>
  ),
  chat: (
    <>
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
      <path d="M8 9h8M8 13h5" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
    </>
  ),
  shield: (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  arrow: <path d="m15 18-6-6 6-6" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  sliders: (
    <>
      <path d="M4 6h16M4 12h16M4 18h16" />
      <circle cx="8" cy="6" r="2" />
      <circle cx="16" cy="12" r="2" />
      <circle cx="10" cy="18" r="2" />
    </>
  ),
  lock: (
    <>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
  sparkles: (
    <>
      <path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2Z" />
      <path d="m19 15 .6 1.9 1.9.6-1.9.6L19 20l-.6-1.9-1.9-.6 1.9-.6Z" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  book: (
    <>
      <path d="M4 5a3 3 0 0 1 3-3h13v17H7a3 3 0 0 0-3 3Z" />
      <path d="M4 5v17" />
    </>
  ),
  briefcase: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V4h6v3M3 12h18" />
    </>
  ),
  location: (
    <>
      <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  moon: <path d="M20.5 15.5A8.5 8.5 0 0 1 8.5 3.5a8.5 8.5 0 1 0 12 12Z" />,
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  wallet: (
    <>
      <rect x="3" y="5" width="18" height="15" rx="2" />
      <path d="M3 8h18M16 14h2" />
    </>
  ),
  phone: (
    <>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.2 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.96.35 1.9.69 2.8a2 2 0 0 1-.45 2.11L8.08 9.92a16 16 0 0 0 6 6l1.29-1.27a2 2 0 0 1 2.11-.45c.9.34 1.84.57 2.8.69A2 2 0 0 1 22 16.92Z" />
    </>
  ),
  video: (
    <>
      <rect x="3" y="5" width="13" height="14" rx="2" />
      <path d="m16 10 5-3v10l-5-3" />
    </>
  ),
  send: (
    <>
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </>
  ),
}

export function Icon({
  name,
  size = 20,
}: {
  name: IconName
  size?: number
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}

export function Logo({
  light = false,
  language = "ar",
}: {
  light?: boolean
  language?: Language
}) {
  const ar = language === "ar"
  return (
    <div
      className={`logo ${light ? "logo-light" : ""}`}
      aria-label={ar ? "شريك العمر" : "Sharik Alomr"}
    >
      <img className="logo-mark-image" src={logoImage.src} alt="" />
      <span>
        <b>{ar ? "شريك العمر" : "Sharik Alomr"}</b>
        <small>{ar ? "Sharik Alomr" : "Marriage with intention"}</small>
      </span>
    </div>
  )
}

export const Button = ({
  children,
  kind = "primary",
  onClick,
  icon,
  disabled = false,
  type,
}: {
  children: React.ReactNode
  kind?: string
  onClick?: () => void
  icon?: IconName
  disabled?: boolean
  type?: "button" | "submit" | "reset"
}) => (
  <button
    className={`btn btn-${kind}`}
    onClick={onClick}
    disabled={disabled}
    type={type}
  >
    {children}
    {icon && <Icon name={icon} size={18} />}
  </button>
)

export type Language = "ar" | "en"
export type Theme = "light" | "dark"
export type PlanConfig = {
  id: string
  nameAr: string
  nameEn: string
  price: number
  currency: string
  active: boolean
  featuresAr: string[]
  featuresEn: string[]
  tier?: string
  key?: string
  featured?: boolean
  annualPrice?: number
  annualSavingsPercent?: number
  descriptionAr?: string
  descriptionEn?: string
  synthetic?: boolean
}

export type WebUser = {
  id: string
  phone: string
  email: string | null
  firstName: string
  lastName: string | null
  gender: "male" | "female" | null
  dateOfBirth: string | null
  accountStatus: string
  verification: string
  isVerifiedBadge: boolean
  profileQuality: number
  country: string | null
  city: string | null
  phoneVerifiedAt: string | null
  createdAt: string
  hasPassword: boolean
  isSheikh: boolean
}

export type BlogArticle = {
  id: string
  slug?: string
  image: string
  categoryAr: string
  categoryEn: string
  titleAr: string
  titleEn: string
  excerptAr: string
  excerptEn: string
  timeAr: string
  timeEn: string
  bodyAr: string[]
  bodyEn: string[]
  publishedAt?: string | null
  isFeatured?: boolean
}

export const initialPlans: PlanConfig[] = [
  {
    id: "free",
    key: "free",
    tier: "free",
    nameAr: "مجاني",
    nameEn: "Free",
    price: 0,
    annualPrice: 0,
    annualSavingsPercent: 0,
    currency: "EGP",
    active: true,
    featured: false,
    descriptionAr: "بداية هادئة للتعارف الجاد.",
    descriptionEn: "A calm start to intentional connections.",
    featuresAr: [
      "ترشيحات أساسية يومية",
      "3 اهتمامات أسبوعيًا",
      "أدوات الخصوصية والأمان",
    ],
    featuresEn: [
      "Daily recommendations",
      "3 interests per week",
      "Privacy and safety tools",
    ],
  },
  {
    id: "gold_monthly",
    key: "gold_monthly",
    tier: "gold",
    nameAr: "جولد",
    nameEn: "Gold",
    price: 199,
    annualPrice: 1990,
    annualSavingsPercent: 17,
    currency: "EGP",
    active: true,
    featured: true,
    descriptionAr: "حدود مضاعفة ومزايا مخصّصة لخُطّاب الجدّية.",
    descriptionEn: "Higher limits and features for serious members.",
    featuresAr: ["ترشيح ذكي", "ملف Top", "مكالمات صوتية ومرئية"],
    featuresEn: ["AI recommendations", "Top profile", "Voice and video calls"],
  },
  {
    id: "platinum_monthly",
    key: "platinum_monthly",
    tier: "platinum",
    nameAr: "بلاتينيوم",
    nameEn: "Platinum",
    price: 399,
    annualPrice: 3990,
    annualSavingsPercent: 17,
    currency: "EGP",
    active: true,
    featured: false,
    descriptionAr: "تجربة كاملة بمزايا أولوية ومرونة أكبر.",
    descriptionEn: "The complete experience with priority features and more flexibility.",
    featuresAr: ["كل مزايا جولد", "تعزيز الملف", "أولوية في الظهور"],
    featuresEn: ["Everything in Gold", "Profile boost", "Priority visibility"],
  },
]

export const blogArticles: BlogArticle[] = [
  {
    id: "questions",
    image:
      "https://images.unsplash.com/photo-1603950227760-e609ce8e15b4?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=80&w=1080",
    categoryAr: "الاستعداد للزواج",
    categoryEn: "Marriage readiness",
    titleAr: "7 أسئلة مهمة قبل بدء رحلة التعارف",
    titleEn: "7 questions before starting your journey",
    excerptAr:
      "خطوات عملية وهادئة تساعدك على اتخاذ قرارات أوضح وبناء حوار أكثر نضجًا.",
    excerptEn:
      "Calm, practical guidance for clearer decisions and more mature conversations.",
    timeAr: "6 دقائق قراءة",
    timeEn: "6 min read",
    bodyAr: [
      "قبل بدء رحلة التعارف، امنح نفسك وقتًا للتفكير فيما تبحث عنه فعلًا. لا تحتاج إلى إجابات مثالية، لكن وضوح أولوياتك يساعدك على اتخاذ قرارات أكثر راحة.",
      "اسأل نفسك: ما القيم التي لا أتنازل عنها؟ كيف أتصور الحياة اليومية بعد الزواج؟ ما معنى التفاهم والاحترام بالنسبة لي؟ وما الأمور التي أحتاج إلى مناقشتها مبكرًا؟",
      "من المفيد أيضًا أن تفكر في أسلوب التواصل المناسب لك، وحدود الخصوصية، ودور الأسرة في هذه المرحلة. اكتب أفكارك ببساطة وراجعها مع الوقت؛ فقد تتغير بعض التفاصيل كلما فهمت نفسك أكثر.",
      "الأهم أن تكون صريحًا ولطيفًا في الوقت نفسه. التعارف الجاد ليس اختبارًا، بل فرصة متبادلة لمعرفة مدى التوافق وبناء الثقة خطوة بخطوة.",
    ],
    bodyEn: [
      "Before beginning the journey, take time to reflect on what you are truly looking for. You do not need perfect answers, but knowing your priorities can make decisions feel clearer.",
      "Ask yourself: Which values are essential to me? What do I imagine everyday life after marriage will look like? What do respect and understanding mean to me, and what would I like to discuss early?",
      "It can also help to consider your communication style, privacy boundaries, and the role you would like family to have. Write down your thoughts and revisit them as you learn more about yourself.",
      "Above all, be honest and kind. Intentional introductions are not a test; they are a shared opportunity to understand compatibility and build trust one step at a time.",
    ],
  },
  {
    id: "expectations",
    image:
      "https://images.unsplash.com/photo-1543233604-3baca4d35513?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=80&w=1080",
    categoryAr: "تواصل صحي",
    categoryEn: "Healthy communication",
    titleAr: "كيف تعبّر عن توقعاتك بوضوح واحترام؟",
    titleEn: "How to express expectations clearly and respectfully",
    excerptAr:
      "تعرّف على طرق بسيطة لبدء حوار صريح يحفظ الاحترام ويقرب وجهات النظر.",
    excerptEn:
      "Simple ways to start an honest conversation that preserves respect and brings perspectives closer.",
    timeAr: "5 دقائق قراءة",
    timeEn: "5 min read",
    bodyAr: [
      "التعبير عن التوقعات بوضوح يقلل سوء الفهم، ويمنح الطرفين فرصة حقيقية لمعرفة ما يناسبهما. اختر وقتًا هادئًا، وابدأ بما تشعر به وما تحتاج إليه بدلًا من افتراض نوايا الطرف الآخر.",
      "استخدم عبارات مباشرة ولطيفة مثل: «من المهم بالنسبة لي أن نتحدث عن…» أو «أشعر بالارتياح عندما…». ركّز على موضوع واحد في كل مرة، واترك مساحة للاستماع والرد.",
      "لا يشترط أن تتفقا على كل شيء فورًا. اسأل أسئلة مفتوحة، واطلب التوضيح عندما تحتاج إليه، وناقشا الخيارات المتاحة دون ضغط أو لوم.",
      "الوضوح المتبادل يساعد على بناء علاقة أكثر احترامًا. وإذا كان موضوع ما حساسًا، يمكن الاتفاق على العودة إليه لاحقًا بعد التفكير.",
    ],
    bodyEn: [
      "Expressing expectations clearly reduces misunderstandings and gives both people a real chance to understand what works for them. Choose a calm moment and speak about your own feelings and needs rather than assuming the other person's intentions.",
      "Use direct, considerate phrases such as “It is important to me that we talk about…” or “I feel comfortable when…”. Focus on one topic at a time and leave room for listening and response.",
      "You do not have to agree on everything immediately. Ask open questions, request clarification when needed, and explore options without pressure or blame.",
      "Mutual clarity supports a more respectful relationship. For sensitive topics, you can agree to return to the conversation after taking time to think.",
    ],
  },
  {
    id: "family",
    image:
      "https://images.unsplash.com/photo-1665385493192-2203c53386b5?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=80&w=1080",
    categoryAr: "الأسرة والقيم",
    categoryEn: "Family & values",
    titleAr: "متى وكيف تشارك الأسرة في رحلة التعارف؟",
    titleEn: "When and how to involve family in the journey",
    excerptAr:
      "أفكار تساعدك على اختيار التوقيت المناسب وإشراك الأسرة بطريقة مريحة.",
    excerptEn:
      "Ideas to help you choose the right time and involve family comfortably.",
    timeAr: "4 دقائق قراءة",
    timeEn: "4 min read",
    bodyAr: [
      "مشاركة الأسرة قد تمنح رحلة التعارف دعمًا وطمأنينة، ويختلف التوقيت المناسب من شخص لآخر. فكّر أولًا في مدى استعدادك وفي الخطوة التي تشعر أنها مناسبة لكما.",
      "تحدث مع الطرف الآخر عن التوقعات قبل إشراك أفراد الأسرة. اتفقا على من سيشارك، وما المعلومات التي ترغبان في مشاركتها، وكيف تحافظان على مساحة كافية للتعارف المباشر.",
      "يمكن أن تبدأ المشاركة بخطوة بسيطة، مثل إخبار شخص تثق به أو ترتيب لقاء عائلي عندما يشعر الطرفان بالاستعداد. لا تجعل التوقعات الخارجية تستعجل قرارًا يحتاج إلى وقت.",
      "التوازن هو الأساس: استمع إلى نصائح الأسرة، مع الحفاظ على حقكما في اتخاذ القرار بهدوء وبما يناسب قيمكما وظروفكما.",
    ],
    bodyEn: [
      "Family involvement can bring support and reassurance, but the right timing differs for everyone. Consider your readiness and the next step that feels appropriate for both of you.",
      "Talk with the other person about expectations before involving relatives. Agree on who will be included, what information you want to share, and how to preserve enough space for getting to know one another.",
      "You can begin with a small step, such as speaking with someone you trust or arranging a family meeting when both people feel ready. Outside expectations should not rush a decision that needs time.",
      "Balance is key: listen to family advice while keeping the right to make a calm decision that fits your values and circumstances.",
    ],
  },
  {
    id: "boundaries",
    image:
      "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=80&w=1080",
    categoryAr: "حدود صحية",
    categoryEn: "Healthy boundaries",
    titleAr: "كيف تضع حدودًا واضحة من البداية؟",
    titleEn: "How to set clear boundaries from the start",
    excerptAr: "الحدود الواضحة تساعد الطرفين على بناء تواصل آمن ومتوازن.",
    excerptEn:
      "Clear boundaries help both people build safe and balanced communication.",
    timeAr: "5 دقائق قراءة",
    timeEn: "5 min read",
    bodyAr: [
      "الحدود الواضحة ليست جدارًا بين الأشخاص؛ إنها طريقة للتعبير عن المساحة والاحترام المتبادل. عندما تشرح ما يناسبك بهدوء، يصبح التواصل أكثر أمانًا وراحة للطرفين.",
      "فكّر في حدودك المتعلقة بالوقت، وطريقة التواصل، والخصوصية، والموضوعات التي تفضل مناقشتها تدريجيًا. عبّر عنها بصيغة واضحة ومباشرة، من دون اعتذار عن احتياجاتك الأساسية.",
      "احترم حدود الطرف الآخر كما تتوقع احترام حدودك. إذا لم يكن شيء ما واضحًا، اسأل بدلًا من التخمين، وتقبّل أن لكل شخص إيقاعه الخاص في بناء الثقة.",
      "العلاقة الصحية تسمح بالحوار حول الحدود وتعديلها مع الوقت. وإذا شعرت بعدم الارتياح أو الضغط، فمن حقك التوقف وطلب الدعم.",
    ],
    bodyEn: [
      "Clear boundaries are not walls between people; they are a way to express space and mutual respect. Calmly explaining what works for you can make communication safer and more comfortable for both people.",
      "Consider boundaries around time, communication, privacy, and topics you would prefer to discuss gradually. State them clearly and directly, without apologizing for your basic needs.",
      "Respect the other person's boundaries as you expect yours to be respected. If something is unclear, ask rather than guess, and remember that everyone has their own pace for building trust.",
      "A healthy relationship makes room to talk about boundaries and adjust them over time. If you feel uncomfortable or pressured, you have the right to pause and seek support.",
    ],
  },
  {
    id: "values",
    image:
      "https://images.unsplash.com/photo-1511895426328-dc8714191300?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=80&w=1080",
    categoryAr: "توافق وقيم",
    categoryEn: "Compatibility & values",
    titleAr: "القيم المشتركة: أساس التفاهم على المدى الطويل",
    titleEn: "Shared values: a foundation for lasting understanding",
    excerptAr: "أسئلة تساعدك على استكشاف ما يهمكما فعلًا قبل اتخاذ خطوات جادة.",
    excerptEn:
      "Questions to help you explore what truly matters before taking serious steps.",
    timeAr: "7 دقائق قراءة",
    timeEn: "7 min read",
    bodyAr: [
      "التوافق لا يعني أن يكون الشخصان متشابهين في كل شيء. لكنه يتطلب فهمًا لما يعتبره كل طرف مهمًا، وكيف تؤثر هذه الأولويات في القرارات والحياة اليومية.",
      "ناقشا موضوعات مثل الأسرة، والعمل، وإدارة الوقت، وطريقة حل الخلافات، والمسؤوليات المشتركة. ليس الهدف الوصول إلى إجابات نموذجية، بل اكتشاف طريقة التفكير والاستعداد للحوار.",
      "استمع باهتمام إلى ما يقوله الطرف الآخر، ولا تكتفِ بالإجابات العامة. الأمثلة الواقعية تساعد على فهم كيف تتحول القيم إلى مواقف واختيارات يومية.",
      "عندما تختلف الأولويات، تحدثا عن إمكانية التفاهم والتوازن. الوضوح المبكر يساعدكما على اتخاذ قرار واعٍ يحترم احتياجات الطرفين.",
    ],
    bodyEn: [
      "Compatibility does not mean two people must be alike in every way. It does involve understanding what each person considers important and how those priorities shape decisions and everyday life.",
      "Discuss topics such as family, work, time, resolving disagreements, and shared responsibilities. The goal is not to find perfect answers, but to understand each other's thinking and openness to dialogue.",
      "Listen carefully and go beyond general statements. Real examples can show how values translate into everyday choices and situations.",
      "When priorities differ, talk about whether understanding and balance are possible. Early clarity helps both people make an informed decision that respects their needs.",
    ],
  },
  {
    id: "safety",
    image:
      "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=80&w=1080",
    categoryAr: "التعارف الآمن",
    categoryEn: "Safe introductions",
    titleAr: "نصائح لتجربة تعارف أكثر أمانًا واطمئنانًا",
    titleEn: "Tips for a safer and more reassuring introduction",
    excerptAr: "خطوات عملية تحافظ على خصوصيتك وتساعدك على التواصل بثقة.",
    excerptEn:
      "Practical steps to protect your privacy and help you connect with confidence.",
    timeAr: "4 دقائق قراءة",
    timeEn: "4 min read",
    bodyAr: [
      "الشعور بالاطمئنان جزء مهم من أي تجربة تعارف. خذ وقتك في التعرف على الطرف الآخر، ولا تشارك معلومات شخصية أو مالية قبل أن تشعر بالثقة والارتياح.",
      "حافظ على بيانات الاتصال وموقعك الدقيق، واستخدم أدوات الخصوصية المتاحة. انتبه لأي ضغط لمغادرة المنصة أو إرسال أموال أو صور خاصة.",
      "إذا قررتما اللقاء، اختارا مكانًا عامًا وأخبرا شخصًا تثق به بخطتك. يمكنك إنهاء التواصل أو طلب المساعدة في أي وقت إذا شعرت بعدم الارتياح.",
      "الثقة تُبنى تدريجيًا وبالأفعال. تواصل باحترام، واطلب الدعم أو استخدم أدوات الإبلاغ عند الحاجة.",
    ],
    bodyEn: [
      "Feeling at ease is an important part of any introduction. Take time to get to know the other person, and do not share personal or financial information before you feel comfortable and confident.",
      "Protect your contact details and precise location, and use the privacy tools available. Be cautious of pressure to leave the platform, send money, or share private photos.",
      "If you decide to meet, choose a public place and tell someone you trust about your plans. You can end contact or ask for help at any time if you feel uncomfortable.",
      "Trust is built gradually through actions. Communicate respectfully, and seek support or use reporting tools when needed.",
    ],
  },
]

export function PreferenceControls({
  language,
  theme,
  setLanguage,
  setTheme,
  className = "",
}: {
  language: Language
  theme: Theme
  setLanguage: (language: Language) => void
  setTheme: (theme: Theme) => void
  className?: string
}) {
  return (
    <div
      className={`preference-controls ${className}`}
      aria-label={language === "ar" ? "تفضيلات العرض" : "Display preferences"}
    >
      <button
        onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
        aria-label={
          language === "ar" ? "Switch to English" : "التبديل إلى العربية"
        }
      >
        <Icon name="globe" size={17} />
        <span>{language === "ar" ? "EN" : "ع"}</span>
      </button>
      <button
        onClick={() => setTheme(theme === "light" ? "dark" : "light")}
        aria-label={theme === "light" ? "الوضع الداكن" : "Light mode"}
      >
        <Icon name={theme === "light" ? "moon" : "sun"} size={17} />
      </button>
    </div>
  )
}

export const SectionTitle = ({
  kicker,
  title,
  text,
}: {
  kicker?: string
  title: string
  text?: string
}) => (
  <div className="section-title">
    {kicker && <span>{kicker}</span>}
    <h2>{title}</h2>
    {text && <p>{text}</p>}
  </div>
)

export const trustItems = [
  [
    "shield",
    "ملفات شخصية موثقة",
    "نراجع الحسابات بعناية لبناء مجتمع أكثر جدية.",
  ],
  ["lock", "خصوصية تحترمك", "أنت من يقرر ما يظهر، ولمن، وفي أي وقت."],
  [
    "sparkles",
    "ترشيحات تناسبك",
    "خيارات مبنية على معايير الزواج والتوافق المشترك.",
  ],
  ["heart", "قبول متبادل", "لا يبدأ التواصل الخاص إلا بعد موافقة الطرفين."],
] as const

export const steps = [
  ["01", "أنشئ ملفك الشخصي", "عرّفنا بنفسك وبما تبحث عنه بكل راحة ووضوح."],
  [
    "02",
    "حدد مواصفات شريك حياتك",
    "اختر المعايير الأساسية والأمور الأكثر أهمية لك.",
  ],
  ["03", "اكتشف الترشيحات المناسبة", "راجع ملفات منتقاة تتوافق مع تفضيلاتك."],
  [
    "04",
    "ابدأ تواصلًا محترمًا",
    "بعد القبول المتبادل، ابدأ التعارف في بيئة آمنة.",
  ],
]

export const profiles = [
  {
    id: "mariam",
    name: "مريم، 29",
    nameEn: "Mariam, 29",
    place: "القاهرة",
    placeEn: "Cairo",
    job: "مهندسة معمارية",
    jobEn: "Architect",
    education: "دراسات عليا",
    educationEn: "Postgraduate",
    marital: "لم يسبق لها الزواج",
    maritalEn: "Never married",
    active: true,
    tags: ["القراءة", "السفر الهادئ"],
    tagsEn: ["Reading", "Quiet travel"],
    image:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=700&q=80",
    score: "92%",
  },
  {
    id: "omar",
    name: "عمر، 33",
    nameEn: "Omar, 33",
    place: "الإسكندرية",
    placeEn: "Alexandria",
    job: "طبيب أسنان",
    jobEn: "Dentist",
    education: "جامعي",
    educationEn: "University",
    marital: "لم يسبق له الزواج",
    maritalEn: "Never married",
    active: true,
    tags: ["العائلة", "التصوير"],
    tagsEn: ["Family", "Photography"],
    image:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=700&q=80",
    score: "88%",
  },
  {
    id: "nour",
    name: "نور، 27",
    nameEn: "Nour, 27",
    place: "الجيزة",
    placeEn: "Giza",
    job: "مصممة منتجات",
    jobEn: "Product designer",
    education: "جامعي",
    educationEn: "University",
    marital: "لم يسبق لها الزواج",
    maritalEn: "Never married",
    active: false,
    tags: ["الفن", "التطوع"],
    tagsEn: ["Art", "Volunteering"],
    image:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=700&q=80",
    score: "85%",
  },
]

export type LocalizedProfile = {
  id: string
  name: string
  place: string
  job: string
  education: string
  marital: string
  active: boolean
  tags: string[]
  image: string
  score: string
}

export function localizeProfile(
  profile: typeof profiles[number],
  language: Language,
): LocalizedProfile {
  const ar = language === "ar"
  return {
    id: profile.id,
    name: ar ? profile.name : profile.nameEn,
    place: ar ? profile.place : profile.placeEn,
    job: ar ? profile.job : profile.jobEn,
    education: ar ? profile.education : profile.educationEn,
    marital: ar ? profile.marital : profile.maritalEn,
    active: profile.active,
    tags: ar ? profile.tags : profile.tagsEn,
    image: profile.image,
    score: profile.score,
  }
}
