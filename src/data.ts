export type Language = "ar" | "en";
export type Theme = "light" | "dark";

export type PlanConfig = {
  id: string;
  nameAr: string;
  nameEn: string;
  price: number;
  currency: string;
  active: boolean;
  featuresAr: string[];
  featuresEn: string[];
};

export const initialPlans: PlanConfig[] = [
  { id: "free", nameAr: "مجاني", nameEn: "Free", price: 0, currency: "EGP", active: true, featuresAr: ["ترشيحات أساسية يومية", "3 اهتمامات أسبوعيًا", "أدوات الخصوصية والأمان"], featuresEn: ["Daily recommendations", "3 interests per week", "Privacy and safety tools"] },
  { id: "premium", nameAr: "Premium", nameEn: "Premium", price: 149, currency: "EGP", active: true, featuresAr: ["ترشيحات موسعة", "اهتمامات ورسائل غير محدودة", "فلاتر بحث متقدمة"], featuresEn: ["Expanded recommendations", "Unlimited interests and messages", "Advanced filters"] },
  { id: "family", nameAr: "العائلة", nameEn: "Family", price: 249, currency: "EGP", active: true, featuresAr: ["كل مميزات Premium", "حساب ولي مرافق", "دعم أولوية"], featuresEn: ["Everything in Premium", "Wali companion account", "Priority support"] },
];

export const trustItems = [
  ["shield", "ملف موثّق", "معايير مراجعة واضحة لبيئة أكثر أمانًا."],
  ["lock", "خصوصية أولًا", "تتحكم في ما يراه الآخرون ومتى."],
  ["sparkles", "تطابق مدروس", "ترشيحات مبنية على القيم والاهتمامات."],
  ["heart", "موافقة متبادلة", "التواصل يبدأ فقط بعد قبول متبادل."],
] as const;

export const steps = [
  ["01", "أنشئ ملفك", "أخبرنا عن نفسك وما تبحث عنه."],
  ["02", "ضع تفضيلاتك", "اختر القيم والصفات التي تهمك."],
  ["03", "استكشف الترشيحات", "راجع الملفات المتوافقة مع معاييرك."],
  ["04", "تواصل باحترام", "بعد القبول المتبادل ابدأ محادثة آمنة."],
] as const;

export const blogArticles = [
  { id: "questions", image: "https://images.unsplash.com/photo-1603950227760-e609ce8e15b4?auto=format&fit=crop&w=1080&q=80", categoryAr: "الاستعداد للزواج", categoryEn: "Marriage readiness", titleAr: "7 أسئلة مهمة قبل بدء رحلة التعارف", titleEn: "7 questions before starting your journey", excerptAr: "خطوات عملية وهادئة تساعدك على اتخاذ قرارات أوضح وبناء حوار أكثر نضجًا.", excerptEn: "Practical guidance for clearer decisions and more mature conversations.", timeAr: "6 دقائق قراءة", timeEn: "6 min read", bodyAr: ["قبل بدء رحلة التعارف، امنح نفسك وقتًا للتفكير فيما تبحث عنه فعلًا."], bodyEn: ["Before beginning, take time to reflect on what you are truly looking for."] },
  { id: "expectations", image: "https://images.unsplash.com/photo-1543233604-3baca4d35513?auto=format&fit=crop&w=1080&q=80", categoryAr: "تواصل صحي", categoryEn: "Healthy communication", titleAr: "كيف تعبّر عن توقعاتك بوضوح واحترام؟", titleEn: "How to express expectations clearly and respectfully", excerptAr: "تعرّف على طرق بسيطة لبدء حوار صريح يحفظ الاحترام ويقرب وجهات النظر.", excerptEn: "Simple ways to start an honest conversation that preserves respect.", timeAr: "5 دقائق قراءة", timeEn: "5 min read", bodyAr: ["التعبير عن التوقعات بوضوح يقلل سوء الفهم."], bodyEn: ["Expressing expectations clearly reduces misunderstandings."] },
  { id: "family", image: "https://images.unsplash.com/photo-1665385493192-2203c53386b5?auto=format&fit=crop&w=1080&q=80", categoryAr: "الأسرة والقيم", categoryEn: "Family & values", titleAr: "متى وكيف تشارك الأسرة في رحلة التعارف؟", titleEn: "When and how to involve family in the journey", excerptAr: "أفكار تساعدك على اختيار التوقيت المناسب وإشراك الأسرة بطريقة مريحة.", excerptEn: "Ideas to help you choose timing and involve family comfortably.", timeAr: "4 دقائق قراءة", timeEn: "4 min read", bodyAr: ["مشاركة الأسرة قد تمنح رحلة التعارف دعمًا وطمأنينة."], bodyEn: ["Family involvement can bring support and reassurance."] },
] as const;

export type Profile = {
  name: string;
  age: number;
  place: string;
  job: string;
  education: string;
  marital: string;
  score: string;
  image: string;
  tags: string[];
  active: number;
};

export const profiles: Profile[] = [
  { name: "سارة محمد 29", age: 29, place: "القاهرة", job: "مهندسة برمجيات", education: "جامعي", marital: "لم يسبق لها الزواج", score: "96%", image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=80", tags: ["القراءة", "السفر", "الاستقرار"], active: 1 },
  { name: "أميرة علي 31", age: 31, place: "الجيزة", job: "مصممة", education: "جامعي", marital: "لم يسبق لها الزواج", score: "92%", image: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=900&q=80", tags: ["الرحلات", "الطبيعة", "التطوع"], active: 0 },
  { name: "سارة أحمد 27", age: 27, place: "الإسكندرية", job: "أخصائية تسويق", education: "جامعي", marital: "لم يسبق لها الزواج", score: "94%", image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80", tags: ["القراءة", "الهدوء", "الرحلات"], active: 1 },
  { name: "ريم خالد 33", age: 33, place: "القاهرة", job: "طبيبة", education: "دراسات عليا", marital: "مطلقة", score: "89%", image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=900&q=80", tags: ["الأسرة", "التنمية", "الحوار"], active: 1 },
];
