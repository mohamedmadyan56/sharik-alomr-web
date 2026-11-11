import { useEffect, useRef, useState } from "react"
import type React from "react"
import {
  Button,
  Icon,
  Logo,
  type Language,
} from "../app-shared"
import { ApiClientError, authApi, mediaApi, profileApi } from "../lib/api"
import type { ApiLoginResult } from "../lib/api"
import {
  GoogleAuthError,
  loadGoogleIdentity,
  requestGoogleAccessToken,
} from "../lib/google"

type SignupData = {
  name: string
  gender: string
  birth: string
  city: string
  marital: string
  education: string
  profession: string
  income: string
  height: string
  languages: string
  ageMin: string
  ageMax: string
  country: string
  religion: string
  timeline: string
  relocation: string
  smoking: string
  children: string
  bio: string
}


const dealBreakerKeys: Record<string, string> = {
  "التدخين": "smoking",
  Smoking: "smoking",
  "وجود أطفال من زواج سابق": "previous_marriage",
  "Children from a previous marriage": "previous_marriage",
  "التوافق الديني": "not_religious",
  "Religious compatibility": "not_religious",
  "الاستعداد للانتقال": "long_distance",
  "Willingness to relocate": "long_distance",
}

function mapGender(value: string): "male" | "female" | undefined {
  if (value === "أنثى" || value === "Female") return "female"
  if (value === "ذكر" || value === "Male") return "male"
  return undefined
}

function mapMarital(value: string): string | undefined {
  if (value === "لم يسبق لي الزواج" || value === "Never married") return "single"
  if (value === "مطلق/ـة" || value === "Divorced") return "divorced"
  if (value === "أرمل/ـة" || value === "Widowed") return "widowed"
  return undefined
}

function mapEducation(value: string): string | undefined {
  if (value === "ثانوي" || value === "Secondary") return "high_school"
  if (value === "جامعي" || value === "University") return "bachelor"
  if (value === "دراسات عليا" || value === "Postgraduate") return "master"
  if (value === "أفضل عدم الإفصاح" || value === "Prefer not to say") return "other"
  return undefined
}

function mapSmoking(value: string): string | undefined {
  if (value === "لا أدخن" || value === "I don't smoke") return "no"
  if (value === "أدخن أحيانًا" || value === "I smoke occasionally") return "sometimes"
  if (value === "أفضل عدم الإفصاح" || value === "Prefer not to say") return undefined
  return undefined
}

function mapTimeline(value: string): string | undefined {
  if (value === "خلال 6 أشهر" || value === "Within 6 months") return "months_6"
  if (value === "خلال سنة" || value === "Within a year") return "months_12"
  if (value === "مرن" || value === "Flexible") return "unspecified"
  return undefined
}

function mapRelocation(value: string): string | undefined {
  if (value === "نعم" || value === "Yes") return "willing"
  if (value === "لا" || value === "No") return "unwilling"
  if (value === "قابلة للنقاش" || value === "Open to discussion") return "conditional"
  return undefined
}

function mapChildren(value: string): string | undefined {
  if (value === "أرغب في الإنجاب" || value === "I would like children") return "yes"
  if (value === "لا أرغب في الإنجاب" || value === "I do not want children") return "no"
  if (value === "قابلة للنقاش" || value === "Open to discussion") return "undecided"
  return undefined
}

function buildOnboardingPayload(
  data: SignupData,
  interests: string[],
  dealBreakers: string[],
  privacy: Record<string, boolean>,
) {
  const gender = mapGender(data.gender)
  const maritalStatus = mapMarital(data.marital)
  const education = mapEducation(data.education)
  const smoking = mapSmoking(data.smoking)
  const marriageTimeline = mapTimeline(data.timeline)
  const relocation = mapRelocation(data.relocation)
  const wantsChildren = mapChildren(data.children)
  const heightCm = Number(data.height)
  const languages = data.languages
    .split(/[,،]/)
    .map((item) => item.trim())
    .filter(Boolean)

  return {
    basics: {
      firstName: data.name.trim(),
      ...(gender ? { gender } : {}),
      dateOfBirth: data.birth,
      country: "EG",
      city: data.city,
    },
    details: {
      ...(maritalStatus ? { maritalStatus } : {}),
      ...(education ? { education } : {}),
      ...(data.profession.trim() ? { profession: data.profession.trim() } : {}),
      ...(data.income ? { incomeRange: data.income } : {}),
      ...(heightCm >= 120 && heightCm <= 230 ? { heightCm } : {}),
      ...(languages.length ? { languages } : {}),
      ...(smoking ? { smoking } : {}),
    },
    marriage: {
      ...(data.religion.trim() ? { religion: data.religion.trim() } : {}),
      ...(marriageTimeline ? { marriageTimeline } : {}),
      ...(relocation ? { relocation } : {}),
      ...(wantsChildren ? { wantsChildren } : {}),
    },
    about: {
      ...(data.bio.trim() ? { bio: data.bio.trim() } : {}),
      interests,
      personality: [],
      lifestyle: [],
    },
    preferences: {
      ageMin: Number(data.ageMin) || 18,
      ageMax: Number(data.ageMax) || 80,
      countries: ["EG"],
    },
    privacy: {
      profileVisibility: privacy.profile ? "public" : "private",
      showOnlineStatus: Boolean(privacy.online),
      hideLastSeen: Boolean(privacy.incognito),
      searchable: Boolean(privacy.profile),
      privatePhotosNeedApproval: !privacy.photos,
    },
    dealBreakerKeys: dealBreakers
      .map((item) => dealBreakerKeys[item])
      .filter(Boolean),
  }
}

export function Onboarding({
  done,
  back,
  language,
}: {
  done: () => void
  back: () => void
  language: Language
}) {
  const ar = language === "ar"
  const [step, setStep] = useState(1)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [consent, setConsent] = useState(false)
  const [interests, setInterests] = useState<string[]>([])
  const [dealBreakers, setDealBreakers] = useState<string[]>([])
  const [photo, setPhoto] = useState("")
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [privacy, setPrivacy] = useState<Record<string, boolean>>({
    profile: true,
    photos: false,
    online: false,
    incognito: false,
  })
  const [data, setData] = useState<SignupData>({
    name: "",
    gender: "",
    birth: "",
    city: "",
    marital: "",
    education: "",
    profession: "",
    income: "",
    height: "",
    languages: ar ? "العربية" : "Arabic",
    ageMin: "25",
    ageMax: "38",
    country: ar ? "مصر" : "Egypt",
    religion: "",
    timeline: "",
    relocation: ar ? "قابلة للنقاش" : "Open to discussion",
    smoking: "",
    children: "",
    bio: "",
  })
  const total = 7
  const update = (key: keyof SignupData, value: string) =>
    setData((current) => ({ ...current, [key]: value }))
  const advance = async () => {
    setError("")
    if (
      step === 1 &&
      (!data.name.trim() ||
        !data.gender ||
        !data.birth ||
        !data.city ||
        !data.marital)
    ) {
      setError(
        ar
          ? "أكملي الحقول الأساسية المطلوبة قبل المتابعة."
          : "Please complete the required basic fields before continuing.",
      )
      return
    }
    if (step === 7) {
      if (!consent) {
        setError(
          ar
            ? "يجب الموافقة على الشروط وتأكيد نية الزواج الجاد."
            : "You must accept the terms and confirm your intention of serious marriage.",
        )
        return
      }
      setSaving(true)
      try {
        let storageKey: string | undefined
        if (photoFile) {
          const uploaded = await mediaApi.upload(photoFile, "profile_photo")
          storageKey = uploaded.storageKey
        }
        await profileApi.onboarding(buildOnboardingPayload(data, interests, dealBreakers, privacy))
        if (storageKey) {
          await profileApi.addPhoto({
            storageKey,
            category: privacy.photos ? "public" : "private",
            isPrimary: true,
          })
        }
        done()
      } catch (reason) {
        setError(
          reason instanceof ApiClientError
            ? reason.message
            : ar
              ? "تعذّر حفظ ملفك — حاول مرة أخرى."
              : "Could not save your profile — please try again.",
        )
      } finally {
        setSaving(false)
      }
      return
    }
    setStep((current) => Math.min(total, current + 1))
  }
  const stepTitles = ar
    ? [
        "لنبدأ بالمعلومات الأساسية",
        "خلفيتك التعليمية والشخصية",
        "أسلوب حياتك واهتماماتك",
        "مواصفات شريك حياتك",
        "إضافة صورة شخصية",
        "إعدادات الخصوصية",
        "مراجعة وإرسال",
      ]
    : [
        "Let's start with the basics",
        "Your education and background",
        "Your lifestyle and interests",
        "What you look for in a partner",
        "Add a profile photo",
        "Privacy settings",
        "Review and submit",
      ]
  return (
    <div className="onboarding" dir={ar ? "rtl" : "ltr"}>
      <header>
        <Logo language={language} />
        <button onClick={back}>
          {ar ? "العودة للرئيسية" : "Back to home"}
        </button>
      </header>
      <main>
        <div className="onboarding-aside">
          <span className="onboarding-icon">
            <Icon
              name={step === 1 ? "user" : step < 5 ? "book" : "shield"}
              size={34}
            />
          </span>
          <p>
            {ar ? "خطوة" : "Step"} {step} {ar ? "من" : "of"} {total}
          </p>
          <h1>{stepTitles[step - 1]}</h1>
          <p>
            {ar
              ? "نستخدم هذه المعلومات لتقديم تجربة أكثر دقة. لن نعرض أي بيانات حساسة دون إذنك."
              : "We use this information to offer a more accurate experience. No sensitive data is shown without your permission."}
          </p>
          <div className="progress-steps">
            {Array.from({ length: total }, (_, i) => (
              <i className={i < step ? "active" : ""} key={i} />
            ))}
          </div>
          <blockquote>
            {ar
              ? "“كل إجابة صادقة تقرّبك خطوة من اختيار أكثر توافقًا.”"
              : "“Every honest answer brings you closer to a more compatible choice.”"}
          </blockquote>
        </div>
        <div className="onboarding-form">
          <div className="mobile-progress">
            {ar ? "الخطوة" : "Step"} {step} {ar ? "من" : "of"} {total}
            <span>
              <i style={{ width: `${(step / total) * 100}%` }} />
            </span>
          </div>
          {step === 1 && (
            <>
              <div className="form-heading">
                <span>{ar ? "المعلومات الأساسية" : "Basic information"}</span>
                <h2>{ar ? "يسعدنا التعرف عليك" : "We are glad to meet you"}</h2>
                <p>
                  {ar
                    ? "الحقول المعلّمة بنجمة مطلوبة لإكمال التسجيل."
                    : "Fields marked with an asterisk are required to complete registration."}
                </p>
              </div>
              <div className="form-grid">
                <label>
                  {ar ? "الاسم الأول" : "First name"} <b>*</b>
                  <input
                    required
                    value={data.name}
                    onChange={(event) => update("name", event.target.value)}
                    placeholder={
                      ar ? "أدخل اسمك الأول" : "Enter your first name"
                    }
                  />
                </label>
                <label>
                  {ar ? "النوع" : "Gender"} <b>*</b>
                  <select
                    required
                    value={data.gender}
                    onChange={(event) => update("gender", event.target.value)}
                  >
                    <option value="">{ar ? "اختر" : "Select"}</option>
                    <option>{ar ? "أنثى" : "Female"}</option>
                    <option>{ar ? "ذكر" : "Male"}</option>
                  </select>
                </label>
                <label>
                  {ar ? "تاريخ الميلاد" : "Date of birth"} <b>*</b>
                  <input
                    required
                    type="date"
                    value={data.birth}
                    onChange={(event) => update("birth", event.target.value)}
                  />
                </label>
                <label>
                  {ar ? "المحافظة" : "Governorate"} <b>*</b>
                  <select
                    required
                    value={data.city}
                    onChange={(event) => update("city", event.target.value)}
                  >
                    <option value="">
                      {ar ? "اختر المحافظة" : "Select governorate"}
                    </option>
                    {(ar
                      ? ["القاهرة", "الجيزة", "الإسكندرية", "محافظة أخرى"]
                      : ["Cairo", "Giza", "Alexandria", "Other governorate"]
                    ).map((city) => (
                      <option key={city}>{city}</option>
                    ))}
                  </select>
                </label>
                <label className="wide">
                  {ar ? "الحالة الاجتماعية" : "Marital status"} <b>*</b>
                  <div className="choice-row">
                    {(ar
                      ? ["لم يسبق لي الزواج", "مطلق/ـة", "أرمل/ـة"]
                      : ["Never married", "Divorced", "Widowed"]
                    ).map((value) => (
                      <button
                        type="button"
                        className={data.marital === value ? "selected" : ""}
                        onClick={() => update("marital", value)}
                        key={value}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </label>
              </div>
              <div className="privacy-note">
                <Icon name="lock" />
                <div>
                  <b>{ar ? "معلوماتك في أمان" : "Your information is safe"}</b>
                  <p>
                    {ar
                      ? "لن نعرض اسمك الكامل أو تاريخ ميلادك أو موقعك الدقيق لأي مستخدم."
                      : "We never show your full name, date of birth, or precise location to other users."}
                  </p>
                </div>
              </div>
            </>
          )}
          {step > 1 && step < 7 && (
            <GenericStep
              step={step}
              data={data}
              update={update}
              interests={interests}
              setInterests={setInterests}
              dealBreakers={dealBreakers}
              setDealBreakers={setDealBreakers}
              photo={photo}
              onPhotoFile={(file) => {
                setPhotoFile(file)
                setPhoto(URL.createObjectURL(file))
              }}
              privacy={privacy}
              setPrivacy={setPrivacy}
              language={language}
            />
          )}{" "}
          {step === 7 && (
            <Review
              data={data}
              interests={interests}
              consent={consent}
              setConsent={setConsent}
              language={language}
            />
          )}{" "}
          {error && (
            <p className="inline-feedback" role="alert">
              {error}
            </p>
          )}
          <div className="form-actions">
            <Button
              kind="ghost"
              onClick={() => {
                setError("")
                step > 1 ? setStep(step - 1) : back()
              }}
            >
              {ar ? "السابق" : "Previous"}
            </Button>
            <Button
              onClick={() => void advance()}
              icon="arrow"
              disabled={saving}
            >
              {saving
                ? ar
                  ? "جارٍ حفظ ملفك…"
                  : "Saving your profile…"
                : step === total
                  ? ar
                    ? "إرسال الملف للمراجعة"
                    : "Submit profile for review"
                  : ar
                    ? "حفظ ومتابعة"
                    : "Save and continue"}
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}

function GenericStep({
  step,
  data,
  update,
  interests,
  setInterests,
  dealBreakers,
  setDealBreakers,
  photo,
  onPhotoFile,
  privacy,
  setPrivacy,
  language,
}: {
  step: number
  data: SignupData
  update: (key: keyof SignupData, value: string) => void
  interests: string[]
  setInterests: (next: string[]) => void
  dealBreakers: string[]
  setDealBreakers: (next: string[]) => void
  photo: string
  onPhotoFile: (file: File) => void
  privacy: Record<string, boolean>
  setPrivacy: (next: Record<string, boolean>) => void
  language: Language
}) {
  const ar = language === "ar"
  const toggle = (
    values: string[],
    setter: (next: string[]) => void,
    item: string,
  ) =>
    setter(
      values.includes(item)
        ? values.filter((value) => value !== item)
        : [...values, item],
    )
  const heading: Record<number, [string, string]> = ar
    ? {
        2: ["خلفيتك", "حدّثنا عن دراستك وعملك"],
        3: ["أسلوب الحياة", "ما الأشياء التي تعبّر عنك؟"],
        4: ["تفضيلات الزواج", "حددي ما يهمك في شريك الحياة"],
        5: ["صورة اختيارية", "أضيفي صورة واضحة ومحترمة"],
        6: ["خصوصيتك", "اختاري ما يناسب راحتك"],
      }
    : {
        2: ["Your background", "Tell us about your studies and work"],
        3: ["Lifestyle", "What represents you?"],
        4: ["Marriage preferences", "Choose what matters in a life partner"],
        5: ["Optional photo", "Add a clear, respectful photo"],
        6: ["Your privacy", "Choose what feels comfortable"],
      }
  const [k, t] = heading[step]
  const privacyOptions: [string, string][] = ar
    ? [
        ["profile", "إظهار ملفي في الترشيحات"],
        ["photos", "إظهار الصور للجميع"],
        ["online", "إظهار حالة النشاط"],
        ["incognito", "التصفح المخفي"],
      ]
    : [
        ["profile", "Show my profile in recommendations"],
        ["photos", "Show my photos to everyone"],
        ["online", "Show my activity status"],
        ["incognito", "Incognito browsing"],
      ]
  const interestOptions = ar
    ? [
        "القراءة",
        "السفر",
        "الرياضة",
        "العائلة",
        "الفن",
        "التطوع",
        "الطبخ",
        "التعلم",
      ]
    : [
        "Reading",
        "Travel",
        "Sports",
        "Family",
        "Art",
        "Volunteering",
        "Cooking",
        "Learning",
      ]
  return (
    <>
      <div className="form-heading">
        <span>{k}</span>
        <h2>{t}</h2>
        <p>
          {ar
            ? "يمكنك تعديل هذه الخيارات لاحقًا من إعدادات حسابك."
            : "You can change these options later from your account settings."}
        </p>
      </div>
      {step === 2 && (
        <div className="form-grid">
          <label>
            {ar ? "المؤهل الدراسي" : "Education level"}
            <select
              value={data.education}
              onChange={(event) => update("education", event.target.value)}
            >
              <option value="">{ar ? "اختر" : "Select"}</option>
              <option>{ar ? "ثانوي" : "Secondary"}</option>
              <option>{ar ? "جامعي" : "University"}</option>
              <option>{ar ? "دراسات عليا" : "Postgraduate"}</option>
              <option>{ar ? "أفضل عدم الإفصاح" : "Prefer not to say"}</option>
            </select>
          </label>
          <label>
            {ar ? "مجال العمل" : "Field of work"}
            <input
              value={data.profession}
              onChange={(event) => update("profession", event.target.value)}
              placeholder={ar ? "مثال: التعليم" : "Example: Education"}
            />
          </label>
          <label>
            {ar ? "نطاق الدخل" : "Income range"}
            <select
              value={data.income}
              onChange={(event) => update("income", event.target.value)}
            >
              <option value="">
                {ar ? "أفضل عدم الإفصاح" : "Prefer not to say"}
              </option>
              <option>{ar ? "أقل من 10,000" : "Under 10,000"}</option>
              <option>10,000–25,000</option>
              <option>{ar ? "أكثر من 25,000" : "Over 25,000"}</option>
            </select>
          </label>
          <label>
            {ar ? "الطول (سم)" : "Height (cm)"}
            <input
              type="number"
              min="100"
              max="230"
              value={data.height}
              onChange={(event) => update("height", event.target.value)}
            />
          </label>
          <label>
            {ar ? "اللغات" : "Languages"}
            <input
              value={data.languages}
              onChange={(event) => update("languages", event.target.value)}
            />
          </label>
          <label>
            {ar ? "نبذة عني" : "About me"}
            <textarea
              maxLength={500}
              value={data.bio}
              onChange={(event) => update("bio", event.target.value)}
            />
          </label>
        </div>
      )}
      {step === 3 && (
        <>
          <div className="interest-choices">
            {interestOptions.map((item, index) => (
              <button
                type="button"
                className={interests.includes(item) ? "selected" : ""}
                onClick={() => toggle(interests, setInterests, item)}
                key={item}
              >
                <Icon name={index % 2 ? "heart" : "sparkles"} />
                {item}
                <span>{interests.includes(item) ? "✓" : "+"}</span>
              </button>
            ))}
          </div>
          <label className="onboarding-select">
            {ar ? "التدخين" : "Smoking"}
            <select
              value={data.smoking}
              onChange={(event) => update("smoking", event.target.value)}
            >
              <option value="">{ar ? "اختاري" : "Select"}</option>
              <option>{ar ? "لا أدخن" : "I don't smoke"}</option>
              <option>{ar ? "أدخن أحيانًا" : "I smoke occasionally"}</option>
              <option>{ar ? "أفضل عدم الإفصاح" : "Prefer not to say"}</option>
            </select>
          </label>
        </>
      )}
      {step === 4 && (
        <>
          <div className="form-grid">
            <label>
              {ar ? "العمر من" : "Age from"}
              <input
                type="number"
                min="18"
                value={data.ageMin}
                onChange={(event) => update("ageMin", event.target.value)}
              />
            </label>
            <label>
              {ar ? "إلى" : "To"}
              <input
                type="number"
                min="18"
                value={data.ageMax}
                onChange={(event) => update("ageMax", event.target.value)}
              />
            </label>
            <label>
              {ar ? "الدولة" : "Country"}
              <input
                value={data.country}
                onChange={(event) => update("country", event.target.value)}
              />
            </label>
            <label>
              {ar ? "المحافظة المفضلة" : "Preferred governorate"}
              <select
                value={data.city}
                onChange={(event) => update("city", event.target.value)}
              >
                <option value="">{ar ? "أي محافظة" : "Any governorate"}</option>
                {(ar
                  ? ["القاهرة", "الجيزة", "الإسكندرية", "مرن"]
                  : ["Cairo", "Giza", "Alexandria", "Flexible"]
                ).map((city) => (
                  <option key={city}>{city}</option>
                ))}
              </select>
            </label>
            <label>
              {ar ? "التفضيلات الدينية" : "Religious preferences"}
              <input
                value={data.religion}
                onChange={(event) => update("religion", event.target.value)}
                placeholder={ar ? "اختياري" : "Optional"}
              />
            </label>
            <label>
              {ar ? "توقيت الزواج" : "Marriage timeline"}
              <select
                value={data.timeline}
                onChange={(event) => update("timeline", event.target.value)}
              >
                <option value="">{ar ? "اختاري" : "Select"}</option>
                <option>{ar ? "خلال 6 أشهر" : "Within 6 months"}</option>
                <option>{ar ? "خلال سنة" : "Within a year"}</option>
                <option>{ar ? "مرن" : "Flexible"}</option>
              </select>
            </label>
            <label>
              {ar ? "الاستعداد للانتقال" : "Willingness to relocate"}
              <select
                value={data.relocation}
                onChange={(event) => update("relocation", event.target.value)}
              >
                <option>{ar ? "قابلة للنقاش" : "Open to discussion"}</option>
                <option>{ar ? "نعم" : "Yes"}</option>
                <option>{ar ? "لا" : "No"}</option>
              </select>
            </label>
            <label>
              {ar ? "الرغبة في الإنجاب" : "Children"}
              <select
                value={data.children}
                onChange={(event) => update("children", event.target.value)}
              >
                <option value="">{ar ? "اختاري" : "Select"}</option>
                <option>
                  {ar ? "أرغب في الإنجاب" : "I would like children"}
                </option>
                <option>
                  {ar ? "لا أرغب في الإنجاب" : "I do not want children"}
                </option>
                <option>{ar ? "قابلة للنقاش" : "Open to discussion"}</option>
              </select>
            </label>
          </div>
          <fieldset className="permission-options">
            <legend>
              {ar ? "نقاط رفض قاطع (اختيارية)" : "Deal breakers (optional)"}
            </legend>
            {(ar
              ? [
                  "التدخين",
                  "وجود أطفال من زواج سابق",
                  "التوافق الديني",
                  "الاستعداد للانتقال",
                ]
              : [
                  "Smoking",
                  "Children from a previous marriage",
                  "Religious compatibility",
                  "Willingness to relocate",
                ]
            ).map((item) => (
              <label key={item}>
                <input
                  type="checkbox"
                  checked={dealBreakers.includes(item)}
                  onChange={() => toggle(dealBreakers, setDealBreakers, item)}
                />
                {item}
              </label>
            ))}
          </fieldset>
        </>
      )}
      {step === 5 && (
        <div className="upload-box">
          <Icon name="user" size={42} />
          {photo && (
            <img
              className="signup-photo-preview"
              src={photo}
              alt={ar ? "معاينة صورتك" : "Your photo preview"}
            />
          )}
          <h3>
            {ar ? "أضيفي صورة واضحة ومحترمة" : "Add a clear, respectful photo"}
          </h3>
          <p>
            {ar
              ? "JPG أو PNG أو WebP، وبحد أقصى 5MB. الصورة اختيارية."
              : "JPG, PNG, or WebP, up to 5MB. The photo is optional."}
          </p>
          <label className="btn btn-soft avatar-upload">
            {ar ? "اختيار صورة" : "Choose a photo"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ""
                if (!file) return
                if (file.size > 5 * 1024 * 1024) {
                  return
                }
                onPhotoFile(file)
              }}
            />
          </label>
          <label className="onboarding-select">
            {ar ? "خصوصية الصورة" : "Photo privacy"}
            <select>
              <option>
                {ar
                  ? "تظهر بعد قبول الاهتمام"
                  : "Visible after interest is accepted"}
              </option>
              <option>
                {ar
                  ? "خاصة وتتطلب موافقتي"
                  : "Private and requires my approval"}
              </option>
              <option>{ar ? "عامة" : "Public"}</option>
            </select>
          </label>
          <small>
            {ar
              ? "المعاينة محفوظة في المتصفح الحالي فقط."
              : "The preview is stored in this browser only."}
          </small>
        </div>
      )}
      {step === 6 && (
        <div className="privacy-setup">
          {privacyOptions.map(([key, label]) => (
            <div className="toggle-row" key={key}>
              <div>
                <b>{label}</b>
                <p>
                  {ar
                    ? "يمكنك تغيير هذا الإعداد لاحقًا من صفحة الخصوصية."
                    : "You can change this setting later from the privacy page."}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={privacy[key]}
                className={`toggle ${privacy[key] ? "on" : ""}`}
                onClick={() => setPrivacy({ ...privacy, [key]: !privacy[key] })}
              >
                <i />
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

function Review({
  data,
  interests,
  consent,
  setConsent,
  language,
}: {
  data: SignupData
  interests: string[]
  consent: boolean
  setConsent: (value: boolean) => void
  language: Language
}) {
  const ar = language === "ar"
  const missing = ar ? "لم يُضف بعد" : "Not added yet"
  const notSet = ar ? "لم يُحدد" : "Not set"
  const summary = ar
    ? [
        `الاسم: ${data.name || missing}`,
        `المعلومات الأساسية: ${data.gender || "—"} · ${data.city || "—"} · ${data.marital || "—"}`,
        `التعليم والعمل: ${data.education || notSet} · ${data.profession || notSet}`,
        `الاهتمامات: ${interests.join("، ") || "لم تُحدد"}`,
        `تفضيلات الزواج: ${data.ageMin}–${data.ageMax} · ${data.timeline || "توقيت مرن"}`,
        `نقاط الرفض القاطع: ${data.religion || "حسب التفضيلات"}`,
      ]
    : [
        `Name: ${data.name || missing}`,
        `Basics: ${data.gender || "—"} · ${data.city || "—"} · ${data.marital || "—"}`,
        `Education and work: ${data.education || notSet} · ${data.profession || notSet}`,
        `Interests: ${interests.join(", ") || "Not set"}`,
        `Marriage preferences: ${data.ageMin}–${data.ageMax} · ${data.timeline || "Flexible timing"}`,
        `Deal breakers: ${data.religion || "Based on preferences"}`,
      ]
  return (
    <>
      <div className="form-heading">
        <span>{ar ? "المراجعة النهائية" : "Final review"}</span>
        <h2>
          {ar
            ? "كل شيء جاهز لبداية موفّقة"
            : "Everything is ready for a good beginning"}
        </h2>
        <p>
          {ar
            ? "راجعي بياناتك ثم أرسلي ملفك. يمكنك تعديلها في أي وقت من الإعدادات."
            : "Review your details, then submit your profile. You can edit them anytime from settings."}
        </p>
      </div>
      <div className="review-list">
        {summary.map((item) => (
          <div key={item}>
            <span>
              <Icon name="check" />
            </span>
            <b>{item}</b>
          </div>
        ))}
      </div>
      <label className="consent">
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
        />{" "}
        {ar ? (
          <>
            أوافق على <u>شروط الاستخدام</u> و<u>سياسة الخصوصية</u>، وأؤكد أن
            نيتي هي الزواج الجاد.
          </>
        ) : (
          <>
            I agree to the <u>terms of use</u> and <u>privacy policy</u>, and I
            confirm that my intention is serious marriage.
          </>
        )}
      </label>
    </>
  )
}

function authErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) return error.message
  return "تعذّر إتمام العملية — حاول مرة أخرى."
}

function SocialIcon({ provider }: { provider: string }) {
  if (provider === "Google") {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
      >
        <path
          fill="#4285F4"
          d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.54 5.54 0 0 1-2.4 3.63v3.02h3.86c2.26-2.09 3.56-5.17 3.56-8.89z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3.02c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24z"
        />
        <path
          fill="#FBBC05"
          d="M5.27 14.27A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.27V6.64H1.29A11.99 11.99 0 0 0 0 12c0 1.94.46 3.77 1.29 5.36l3.98-3.09z"
        />
        <path
          fill="#EA4335"
          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.29 6.64l3.98 3.09C6.22 6.88 8.87 4.75 12 4.75z"
        />
      </svg>
    )
  }

  if (provider === "Facebook") {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
      >
        <circle cx="12" cy="12" r="12" fill="#1877F2" />
        <path
          fill="#fff"
          d="M16.671 15.469 17.203 12h-3.328V9.749c0-.949.465-1.874 1.956-1.874h1.513V4.922s-1.374-.235-2.686-.235c-2.741 0-4.533 1.662-4.533 4.669v2.644H7.078v3.469h3.047V24a12.09 12.09 0 0 0 3.75 0v-8.531h2.796z"
        />
      </svg>
    )
  }

  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  )
}

export default function Login({
  done,
  back,
  language,
  onAuthenticated,
}: {
  done: () => void
  back: () => void
  language: Language
  onAuthenticated?: () => void | Promise<unknown>
}) {
  const ar = language === "ar"
  const [mode, setMode] = useState<"login" | "register">("login")
  const [method, setMethod] = useState<"password" | "otp">("password")
  const [step, setStep] = useState<"form" | "otp" | "twofactor">("form")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [firstName, setFirstName] = useState("")
  const [rememberMe, setRememberMe] = useState(true)
  const [code, setCode] = useState("")
  const [notice, setNotice] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [twoFactorChallenge, setTwoFactorChallenge] = useState("")
  const [twoFactorPhoneHint, setTwoFactorPhoneHint] = useState("")
  const [devCode, setDevCode] = useState("")
  const [resendIn, setResendIn] = useState(0)
  const otpRefs = useRef<Array<HTMLInputElement | null>>([])

  useEffect(() => {
    if (resendIn <= 0) return
    const timer = window.setTimeout(
      () => setResendIn((value) => Math.max(0, value - 1)),
      1000,
    )
    return () => window.clearTimeout(timer)
  }, [resendIn])

  const resetFeedback = () => {
    setError("")
    setNotice("")
  }

  const beginTwoFactor = (result: ApiLoginResult): boolean => {
    if (!result.twoFactorRequired || !result.challenge) return false
    const hint = result.phoneHint ?? phone
    setStep("twofactor")
    setTwoFactorChallenge(result.challenge)
    setTwoFactorPhoneHint(hint)
    setCode("")
    setDevCode(result.devCode ?? "")
    setResendIn(result.resendAfterSeconds ?? 60)
    setNotice(
      ar
        ? `أرسلنا رمزًا مكوّنًا من 5 أرقام إلى ${hint}.`
        : `We sent a 5-digit code to ${hint}.`,
    )
    window.setTimeout(() => otpRefs.current[0]?.focus(), 50)
    return true
  }

  const switchMode = (next: "login" | "register") => {
    resetFeedback()
    setMode(next)
    setStep("form")
    setMethod("password")
    setCode("")
    setDevCode("")
    setTwoFactorChallenge("")
  }

  const handleGoogleLogin = async () => {
    resetFeedback()
    setGoogleLoading(true)
    try {
      const google = await authApi.googleConfig()
      if (!google.enabled || !google.clientId) {
        setNotice(
          ar
            ? "تسجيل الدخول عبر Google غير متاح حاليًا."
            : "Signing in with Google is currently unavailable.",
        )
        return
      }

      await loadGoogleIdentity()
      const accessToken = await requestGoogleAccessToken(google.clientId)
      const result = await authApi.googleLogin({ accessToken, rememberMe })
      if (beginTwoFactor(result)) return
      await onAuthenticated?.()
      done()
    } catch (reason) {
      if (reason instanceof GoogleAuthError) {
        if (reason.code === "cancelled") {
          setNotice(
            ar
              ? "تم إلغاء تسجيل الدخول عبر Google."
              : "Google sign-in was cancelled.",
          )
          return
        }
        if (reason.code === "popup_blocked") {
          setError(
            ar
              ? "المتصفح منع نافذة جوجل — اسمح بالنوافذ المنبثقة وحاول مرة أخرى."
              : "The browser blocked Google's popup — allow popups and try again.",
          )
          return
        }
        if (reason.code === "script_failed") {
          setError(
            ar
              ? "تعذّر تحميل خدمة جوجل — تحقق من الاتصال بالإنترنت وحاول مرة أخرى."
              : "Couldn't load Google sign-in — check your connection and try again.",
          )
          return
        }
        if (reason.code === "timeout") {
          setError(
            ar
              ? "انتهت مهلة الدخول عبر Google — حاول مرة أخرى."
              : "Google sign-in timed out — try again.",
          )
          return
        }
        setError(
          ar
            ? "تعذّر إكمال الدخول عبر Google — حاول مرة أخرى."
            : "Couldn't complete Google sign-in — try again.",
        )
        return
      }
      setError(authErrorMessage(reason))
    } finally {
      setGoogleLoading(false)
    }
  }

  const startOtp = async () => {
    resetFeedback()
    if (!phone.trim()) {
      setError(ar ? "أدخل رقم الهاتف أولًا." : "Enter your phone number first.")
      return
    }
    if (mode === "register") {
      if (!firstName.trim()) {
        setError(ar ? "أدخل اسمك الأول أولًا." : "Enter your first name first.")
        return
      }
      if (password.length < 6) {
        setError(
          ar
            ? "كلمة المرور يجب أن تكون 6 أحرف على الأقل."
            : "Password must be at least 6 characters.",
        )
        return
      }
    }

    setLoading(true)
    try {
      const result =
        mode === "register"
          ? await authApi.registerStart(phone)
          : await authApi.otpLoginStart(phone)
      setStep("otp")
      setCode("")
      setDevCode(result.devCode ?? "")
      setResendIn(result.resendAfterSeconds ?? 60)
      setNotice(
        ar
          ? `أرسلنا رمزًا مكوّنًا من 5 أرقام إلى ${phone}.`
          : `We sent a 5-digit code to ${phone}.`,
      )
      window.setTimeout(() => otpRefs.current[0]?.focus(), 50)
    } catch (reason) {
      setError(authErrorMessage(reason))
    } finally {
      setLoading(false)
    }
  }

  const verifyOtp = async () => {
    resetFeedback()
    if (code.length !== 5) {
      setError(ar ? "أدخل الرمز المكوّن من 5 أرقام." : "Enter the 5-digit code.")
      return
    }

    setLoading(true)
    try {
      if (step === "twofactor") {
        const result = await authApi.twoFactorVerify({
          challenge: twoFactorChallenge,
          code,
          rememberMe,
        })
        if (result.twoFactorRequired) {
          throw new Error(
            ar ? "تعذّر إكمال التحقق." : "Could not complete verification.",
          )
        }
      } else if (mode === "register") {
        await authApi.registerVerify({
          phone,
          code,
          firstName: firstName.trim() || undefined,
          password,
        })
      } else {
        await authApi.otpLoginVerify({ phone, code })
      }
      await onAuthenticated?.()
      done()
    } catch (reason) {
      setError(authErrorMessage(reason))
    } finally {
      setLoading(false)
    }
  }

  const resendOtp = async () => {
    resetFeedback()
    if (step === "twofactor") {
      if (!twoFactorChallenge) return
      setLoading(true)
      try {
        const result = await authApi.twoFactorResend(twoFactorChallenge)
        setDevCode(result.devCode ?? "")
        setResendIn(result.resendAfterSeconds ?? 60)
        setNotice(
          ar
            ? `أرسلنا رمزًا جديدًا إلى ${twoFactorPhoneHint}.`
            : `We sent a new code to ${twoFactorPhoneHint}.`,
        )
      } catch (reason) {
        setError(authErrorMessage(reason))
      } finally {
        setLoading(false)
      }
      return
    }
    await startOtp()
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (step === "otp" || step === "twofactor") {
      await verifyOtp()
      return
    }
    if (mode === "register" || method === "otp") {
      await startOtp()
      return
    }

    resetFeedback()
    if (!phone.trim() || !password) {
      setError(
        ar
          ? "أدخل رقم الهاتف وكلمة المرور."
          : "Enter your phone number and password.",
      )
      return
    }

    setLoading(true)
    try {
      const result = await authApi.login({
        identifier: phone,
        password,
        rememberMe,
      })
      if (beginTwoFactor(result)) return
      await onAuthenticated?.()
      done()
    } catch (reason) {
      setError(authErrorMessage(reason))
    } finally {
      setLoading(false)
    }
  }

  const handleCodeChange = (index: number, value: string) => {
    const digits = value.replace(/\D/g, "")
    const next = Array.from({ length: 5 }, (_, i) => code[i] ?? "")
    if (!digits) {
      next[index] = ""
      setCode(next.join(""))
      return
    }

    digits
      .slice(0, 5 - index)
      .split("")
      .forEach((digit, offset) => {
        next[index + offset] = digit
      })
    setCode(next.join("").slice(0, 5))
    otpRefs.current[Math.min(4, index + digits.length)]?.focus()
  }

  const handleCodeKeyDown = (
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Backspace" && !code[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  const handleCodePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const digits = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 5)
    if (!digits) return
    event.preventDefault()
    setCode(digits)
    otpRefs.current[Math.min(4, digits.length - 1)]?.focus()
  }

  const title =
    step === "otp"
      ? ar
        ? "أدخل رمز التحقق"
        : "Enter the verification code"
      : step === "twofactor"
        ? ar
          ? "التحقق بخطوتين"
          : "Two-step verification"
        : mode === "register"
          ? ar
            ? "أنشئ حسابك"
            : "Create your account"
          : ar
            ? "أهلًا بك مرة أخرى"
            : "Welcome back"

  const subtitle =
    step === "otp"
      ? ar
        ? `أدخل الرمز المكوّن من 5 أرقام المرسل إلى ${phone}.`
        : `Enter the 5-digit code sent to ${phone}.`
      : step === "twofactor"
        ? ar
          ? `أدخل الرمز المكوّن من 5 أرقام المرسل إلى ${twoFactorPhoneHint}.`
          : `Enter the 5-digit code sent to ${twoFactorPhoneHint}.`
        : mode === "register"
          ? ar
            ? "اسمك ورقم هاتفك وكلمة مرور آمنة — ثم نؤكد رقمك برمز تحقق."
            : "Your name, phone, and a secure password — then we verify your number with a code."
          : method === "otp"
            ? ar
              ? "أدخل رقم هاتفك وسنرسل لك رمز تحقق حقيقيًا."
              : "Enter your phone and we will send you a real verification code."
            : ar
              ? "أدخل رقم هاتفك وكلمة المرور للوصول إلى حسابك."
              : "Enter your phone and password to access your account."

  return (
    <div className="auth-page" dir={ar ? "rtl" : "ltr"}>
      <section className="auth-brand">
        <button onClick={back} type="button">
          <Logo light language={language} />
        </button>
        <div>
          <span>
            <Icon name="shield" />{" "}
            {ar ? "دخول آمن ومحمي" : "Secure, protected access"}
          </span>
          <h1>
            {ar ? (
              <>
                مرحبًا بعودتك إلى
                <br />
                رحلة الاختيار الواعي
              </>
            ) : (
              <>
                Welcome back to
                <br />a thoughtful journey
              </>
            )}
          </h1>
          <p>
            {ar
              ? "مساحتك الخاصة لمتابعة ترشيحاتك وتواصلك، بهدوء وخصوصية."
              : "Your private space to follow recommendations and conversations, calmly and privately."}
          </p>
        </div>
        <small>
          {ar
            ? "لن نطلب منك أبدًا مشاركة كلمة المرور أو رمز التحقق مع أي شخص."
            : "We will never ask you to share your password or verification code with anyone."}
        </small>
      </section>
      <section className="auth-form">
        <button className="back-link" onClick={back} type="button">
          <Icon name="arrow" /> {ar ? "العودة للرئيسية" : "Back to home"}
        </button>
        <div className="auth-card">
          {error && (
            <p className="inline-feedback error" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="inline-feedback info" role="status">
              {notice}
            </p>
          )}
          <div className="form-heading">
            <span>
              {mode === "register"
                ? ar
                  ? "حساب جديد"
                  : "New account"
                : step === "otp"
                  ? ar
                    ? "رمز التحقق"
                    : "Verification"
                  : step === "twofactor"
                    ? ar
                      ? "خطوة الأمان"
                      : "Security step"
                    : ar
                      ? "تسجيل الدخول"
                      : "Sign in"}
            </span>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>
          <form onSubmit={submit}>
            {step === "otp" || step === "twofactor" ? (
              <>
                <div className="otp" dir="ltr" onPaste={handleCodePaste}>
                  {Array.from({ length: 5 }, (_, index) => (
                    <input
                      key={index}
                      ref={(element) => {
                        otpRefs.current[index] = element
                      }}
                      value={code[index] ?? ""}
                      onChange={(event) =>
                        handleCodeChange(index, event.target.value)
                      }
                      onKeyDown={(event) => handleCodeKeyDown(index, event)}
                      inputMode="numeric"
                      autoComplete={index === 0 ? "one-time-code" : "off"}
                      maxLength={5}
                      aria-label={
                        ar ? `الرقم ${index + 1}` : `Digit ${index + 1}`
                      }
                    />
                  ))}
                </div>
                {devCode && (
                  <p className="inline-feedback info" dir="ltr">
                    {ar ? "كود التطوير: " : "Dev code: "}
                    <b>{devCode}</b>
                  </p>
                )}
                <Button type="submit" disabled={loading}>
                  {loading
                    ? ar
                      ? "جارٍ التحقق..."
                      : "Verifying..."
                    : step === "twofactor"
                      ? ar
                        ? "تأكيد وتسجيل الدخول"
                        : "Verify and sign in"
                      : mode === "register"
                        ? ar
                          ? "تأكيد وإنشاء الحساب"
                          : "Verify and create account"
                        : ar
                          ? "تسجيل الدخول"
                          : "Sign in"}
                </Button>
                <button
                  type="button"
                  className="resend"
                  disabled={resendIn > 0 || loading}
                  onClick={resendOtp}
                >
                  {resendIn > 0
                    ? ar
                      ? `إعادة الإرسال بعد ${resendIn} ثانية`
                      : `Resend in ${resendIn}s`
                    : ar
                      ? "إعادة إرسال الرمز"
                      : "Resend code"}
                </button>
                <button
                  type="button"
                  className="resend"
                  onClick={() => {
                    setStep("form")
                    setCode("")
                    setDevCode("")
                    setTwoFactorChallenge("")
                    resetFeedback()
                  }}
                >
                  {step === "twofactor"
                    ? ar
                      ? "العودة لتسجيل الدخول"
                      : "Back to sign in"
                    : ar
                      ? "تغيير رقم الهاتف"
                      : "Change phone number"}
                </button>
              </>
            ) : (
              <>
                {mode === "register" && (
                  <label>
                    {ar ? "الاسم الأول" : "First name"}
                    <input
                      value={firstName}
                      onChange={(event) => setFirstName(event.target.value)}
                      autoComplete="given-name"
                      placeholder={ar ? "مريم" : "Maryam"}
                    />
                  </label>
                )}
                <label>
                  {ar ? "رقم الهاتف" : "Phone number"}
                  <div className="phone-input">
                    <span>+20</span>
                    <input
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="10 1234 5678"
                      dir="ltr"
                    />
                  </div>
                </label>
                {(mode === "register" || method === "password") && (
                  <label>
                    {ar ? "كلمة المرور" : "Password"}
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete={
                        mode === "register"
                          ? "new-password"
                          : "current-password"
                      }
                      placeholder="••••••••"
                    />
                  </label>
                )}
                {mode === "login" && method === "password" && (
                  <div className="auth-help">
                    <label>
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(event) =>
                          setRememberMe(event.target.checked)
                        }
                      />{" "}
                      {ar ? "تذكرني" : "Remember me"}
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        resetFeedback()
                        setResetOpen(true)
                      }}
                    >
                      {ar ? "نسيت كلمة المرور؟" : "Forgot password?"}
                    </button>
                  </div>
                )}
                <Button type="submit" disabled={loading || googleLoading}>
                  {loading
                    ? ar
                      ? "لحظة..."
                      : "Please wait..."
                    : mode === "register"
                      ? ar
                        ? "متابعة وإنشاء الحساب"
                        : "Continue to create account"
                      : method === "otp"
                        ? ar
                          ? "إرسال رمز التحقق"
                          : "Send verification code"
                        : ar
                          ? "تسجيل الدخول"
                          : "Sign in"}
                </Button>
                {mode === "login" && (
                  <>
                    <button
                      type="button"
                      className="auth-method-link"
                      onClick={() => {
                        setMethod(method === "password" ? "otp" : "password")
                        resetFeedback()
                      }}
                    >
                      {method === "password"
                        ? ar
                          ? "الدخول برمز تحقق بدلًا من كلمة المرور"
                          : "Sign in with a code instead"
                        : ar
                          ? "الدخول بكلمة المرور بدلًا من الرمز"
                          : "Sign in with a password instead"}
                    </button>
                    <div className="divider">
                      <span>
                        {ar ? "أو تابع باستخدام" : "or continue with"}
                      </span>
                    </div>
                    <div className="social-auth-options">
                      {["Google", "Facebook", "Apple"].map((provider) => {
                        const isGoogle = provider === "Google"
                        return (
                          <Button
                            key={provider}
                            type="button"
                            kind="outline"
                            disabled={loading || googleLoading}
                            onClick={() => {
                              if (isGoogle) {
                                void handleGoogleLogin()
                                return
                              }
                              setNotice(
                                ar
                                  ? `تسجيل الدخول عبر ${provider} غير متاح حاليًا.`
                                  : `Signing in with ${provider} is currently unavailable.`,
                              )
                            }}
                          >
                            <SocialIcon provider={provider} />
                            <span>
                              {isGoogle && googleLoading
                                ? ar
                                  ? "جارٍ الاتصال..."
                                  : "Connecting..."
                                : isGoogle
                                  ? provider
                                  : `${provider} (${ar ? "قريبًا" : "Soon"})`}
                            </span>
                          </Button>
                        )
                      })}
                    </div>
                  </>
                )}
                <p className="auth-switch">
                  {mode === "register" ? (
                    <>
                      {ar ? "لديك حساب بالفعل؟" : "Already have an account?"}{" "}
                      <button type="button" onClick={() => switchMode("login")}>
                        {ar ? "سجّل الدخول" : "Sign in"}
                      </button>
                    </>
                  ) : (
                    <>
                      {ar ? "ليس لديك حساب؟" : "Don't have an account?"}{" "}
                      <button
                        type="button"
                        onClick={() => switchMode("register")}
                      >
                        {ar ? "أنشئ حسابًا جديدًا" : "Create a new account"}
                      </button>
                    </>
                  )}
                </p>
              </>
            )}
          </form>
        </div>
      </section>
      {resetOpen && (
        <PasswordResetDialog
          language={language}
          onClose={() => setResetOpen(false)}
          onSuccess={(identifier) => {
            setResetOpen(false)
            if (!identifier.includes("@")) setPhone(identifier)
            setMode("login")
            setMethod("password")
            setStep("form")
            setNotice(
              ar
                ? "تم تعيين كلمة المرور الجديدة. سجّل الدخول بها الآن."
                : "Your new password is set. Sign in with it now.",
            )
          }}
        />
      )}
    </div>
  )
}

function PasswordResetDialog({
  language,
  onClose,
  onSuccess,
}: {
  language: Language
  onClose: () => void
  onSuccess: (identifier: string) => void
}) {
  const ar = language === "ar"
  const [step, setStep] = useState<"request" | "verify">("request")
  const [identifier, setIdentifier] = useState("")
  const [code, setCode] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [phoneHint, setPhoneHint] = useState("")
  const [devCode, setDevCode] = useState("")
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [busy, setBusy] = useState(false)

  const sendCode = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setNotice("")
    if (!identifier.trim()) {
      setError(ar ? "أدخل رقم الهاتف أو البريد الإلكتروني." : "Enter your phone number or email.")
      return
    }
    setBusy(true)
    try {
      const result = await authApi.forgotPasswordStart(identifier.trim())
      setPhoneHint(result.phoneHint ?? "")
      setDevCode(result.devCode ?? "")
      setNotice(
        result.message ??
          (ar
            ? "لو البيانات مسجّلة عندنا، هيوصلك كود الاستعادة."
            : "If the details are registered, you will receive a reset code."),
      )
      setStep("verify")
    } catch (reason) {
      setError(
        reason instanceof ApiClientError
          ? reason.message
          : ar
            ? "تعذّر إرسال كود الاستعادة."
            : "Could not send the reset code.",
      )
    } finally {
      setBusy(false)
    }
  }

  const resetPassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setNotice("")
    if (!/^\d{5}$/.test(code)) {
      setError(ar ? "كود التحقق 5 أرقام." : "The verification code is 5 digits.")
      return
    }
    if (password.length < 8) {
      setError(ar ? "كلمة المرور 8 أحرف على الأقل." : "The password must be at least 8 characters.")
      return
    }
    if (password !== confirm) {
      setError(ar ? "كلمتا المرور غير متطابقتين." : "The passwords do not match.")
      return
    }
    setBusy(true)
    try {
      await authApi.forgotPasswordVerify({
        identifier: identifier.trim(),
        code,
        newPassword: password,
      })
      onSuccess(identifier.trim())
    } catch (reason) {
      setError(
        reason instanceof ApiClientError
          ? reason.message
          : ar
            ? "تعذّر تعيين كلمة المرور."
            : "Could not reset the password.",
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="reset-overlay" dir={ar ? "rtl" : "ltr"}>
      <div
        className="reset-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="password-reset-title"
      >
        <button
          type="button"
          className="reset-close"
          onClick={onClose}
          aria-label={ar ? "إغلاق" : "Close"}
        >
          ×
        </button>
        <span className="reset-icon">
          <Icon name="lock" size={22} />
        </span>
        <h2 id="password-reset-title">
          {ar ? "استعادة كلمة المرور" : "Reset your password"}
        </h2>
        <p className="reset-subtitle">
          {step === "request"
            ? ar
              ? "أدخل رقم هاتفك أو بريدك الإلكتروني، وسنرسل كود تحقق من 5 أرقام."
              : "Enter your phone number or email and we will send a 5-digit verification code."
            : ar
              ? `أدخل الكود${phoneHint ? ` المرسل إلى ${phoneHint}` : ""} ثم اختر كلمة مرور جديدة.`
              : `Enter the code${phoneHint ? ` sent to ${phoneHint}` : ""} and choose a new password.`}
        </p>

        {error && (
          <p className="inline-feedback error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="inline-feedback info" role="status">
            {notice}
          </p>
        )}
        {devCode && (
          <p className="inline-feedback info" dir="ltr">
            {ar ? "كود التطوير: " : "Dev code: "}
            <b>{devCode}</b>
          </p>
        )}

        {step === "request" ? (
          <form onSubmit={sendCode}>
            <label>
              {ar ? "الهاتف أو البريد الإلكتروني" : "Phone or email"}
              <input
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                autoComplete="username"
                inputMode="tel"
                placeholder={ar ? "01xxxxxxxxx أو name@example.com" : "01xxxxxxxxx or name@example.com"}
                autoFocus
              />
            </label>
            <Button type="submit" disabled={busy}>
              {busy
                ? ar
                  ? "جارٍ الإرسال…"
                  : "Sending…"
                : ar
                  ? "إرسال كود الاستعادة"
                  : "Send reset code"}
            </Button>
          </form>
        ) : (
          <form onSubmit={resetPassword}>
            <label>
              {ar ? "كود التحقق" : "Verification code"}
              <input
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 5))}
                inputMode="numeric"
                autoComplete="one-time-code"
                dir="ltr"
                maxLength={5}
                autoFocus
              />
            </label>
            <label>
              {ar ? "كلمة المرور الجديدة" : "New password"}
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
              />
            </label>
            <label>
              {ar ? "تأكيد كلمة المرور" : "Confirm password"}
              <input
                type="password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                autoComplete="new-password"
              />
            </label>
            <Button type="submit" disabled={busy}>
              {busy
                ? ar
                  ? "جارٍ الحفظ…"
                  : "Saving…"
                : ar
                  ? "تعيين كلمة المرور"
                  : "Set new password"}
            </Button>
            <button
              type="button"
              className="reset-back"
              onClick={() => {
                setStep("request")
                setCode("")
                setPassword("")
                setConfirm("")
                setError("")
                setNotice("")
                setDevCode("")
              }}
            >
              {ar ? "تغيير رقم الهاتف أو البريد" : "Use a different phone or email"}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
