import { useCallback, useEffect, useState } from "react"
import type React from "react"
import {
  Button,
  Icon,
  Logo,
  type IconName,
  type Language,
  type WebUser,
} from "../app-shared"
import {
  ApiClientError,
  authApi,
  callsApi,
  communityApi,
  discoveryApi,
  messagingApi,
  mediaApi,
  notificationsApi,
  profileApi,
  waliApi,
  walletApi,
  type ApiCall,
  type ApiCard,
  type ApiCommunityPost,
  type ApiCommunityTopic,
  type ApiConversation,
  type ApiCreditPackage,
  type ApiCreditTransaction,
  type ApiFullProfile,
  type ApiMessage,
  type ApiNotification,
  type ApiWaliData,
  type ApiWallet,
} from "../lib/api"

function errorText(reason: unknown, fallback: string): string {
  return reason instanceof ApiClientError ? reason.message : fallback
}

function formatDate(value: string | null | undefined, language: Language): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return new Intl.DateTimeFormat(language === "ar" ? "ar-EG" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date)
}

function formatDateTime(value: string | null | undefined, language: Language): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return new Intl.DateTimeFormat(language === "ar" ? "ar-EG" : "en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function splitList(value: string): string[] {
  return value
    .split(/[,،\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function SafeImage({
  src,
  alt,
  fallback,
}: {
  src: string
  alt: string
  fallback: React.ReactNode
}) {
  const [failed, setFailed] = useState(false)
  if (failed) return <>{fallback}</>
  return <img src={src} alt={alt} onError={() => setFailed(true)} />
}

function LoadingCard({ language }: { language: Language }) {
  return (
    <div className="feature-card">
      <p className="inline-feedback" role="status">
        {language === "ar" ? "جارٍ تحميل البيانات…" : "Loading…"}
      </p>
    </div>
  )
}

function Wallet({ language }: { language: Language }) {
  const ar = language === "ar"
  const [data, setData] = useState<ApiWallet | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [buying, setBuying] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await walletApi.get())
      setError("")
    } catch (reason) {
      setError(
        errorText(
          reason,
          ar ? "تعذّر تحميل المحفظة." : "Could not load your wallet.",
        ),
      )
    } finally {
      setLoading(false)
    }
  }, [ar])

  useEffect(() => {
    void load()
  }, [load])

  const buy = async (pack: ApiCreditPackage) => {
    setBuying(pack.id)
    setNotice("")
    try {
      const result = await walletApi.checkout("credit_package", pack.id)
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl
        return
      }
      setNotice(
        result.message ??
          (ar ? "تم إنشاء طلب الدفع." : "Your payment request was created."),
      )
      if (result.paid) await load()
    } catch (reason) {
      setError(
        errorText(
          reason,
          ar ? "تعذّر بدء عملية الدفع." : "Could not start checkout.",
        ),
      )
    } finally {
      setBuying(null)
    }
  }

  if (loading) return <LoadingCard language={language} />

  const balance = data?.balance ?? 0
  const packages = data?.packages ?? []
  const transactions: ApiCreditTransaction[] = data?.transactions ?? []

  return (
    <div className="feature-page">
      <section className="wallet-hero">
        <div>
          <span>{ar ? "رصيدك الحالي" : "Current balance"}</span>
          <b>
            {balance.toLocaleString(ar ? "ar-EG" : "en-US")}{" "}
            <small>{ar ? "رصيد" : "credits"}</small>
          </b>
          <p>
            {ar
              ? "استخدمي الرصيد للمزايا الاختيارية، دون التأثير على أدوات الأمان الأساسية."
              : "Use your balance for optional features without affecting essential safety tools."}
          </p>
        </div>
        <Icon name="wallet" size={48} />
      </section>
      {error && (
        <p className="inline-feedback" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="inline-feedback" role="status">
          {notice}
        </p>
      )}
      <section className="feature-card">
        <div className="feature-heading">
          <div>
            <h2>{ar ? "باقات الرصيد" : "Credit packages"}</h2>
            <p>
              {ar
                ? "اختاري باقة لإضافة رصيد إلى محفظتك."
                : "Choose a package to add credits to your wallet."}
            </p>
          </div>
        </div>
        <div className="credit-packages">
          {packages.map((pack) => (
            <article key={pack.id}>
              <span>{pack.name}</span>
              <b>
                {(pack.baseCredits + pack.bonusCredits).toLocaleString(
                  ar ? "ar-EG" : "en-US",
                )}{" "}
                {ar ? "رصيد" : "credits"}
              </b>
              <small>
                {pack.priceAmount.toLocaleString(ar ? "ar-EG" : "en-US")}{" "}
                {pack.currency}
              </small>
              <Button
                disabled={buying === pack.id}
                onClick={() => void buy(pack)}
              >
                {buying === pack.id
                  ? ar
                    ? "جارٍ التحويل…"
                    : "Redirecting…"
                  : ar
                    ? "شراء الباقة"
                    : "Buy package"}
              </Button>
            </article>
          ))}
          {packages.length === 0 && (
            <div className="empty-state">
              {ar
                ? "لا توجد باقات رصيد متاحة حاليًا."
                : "No credit packages are available right now."}
            </div>
          )}
        </div>
      </section>
      <section className="feature-card">
        <div className="feature-heading">
          <div>
            <h2>{ar ? "سجل الحركات" : "Transaction history"}</h2>
            <p>
              {ar
                ? "كل حركات الرصيد المسجّلة على حسابك."
                : "Every credit movement recorded on your account."}
            </p>
          </div>
        </div>
        <div className="ledger-list">
          {transactions.map((row) => (
            <div key={row.id}>
              <span className={row.amount >= 0 ? "credit-in" : "credit-out"}>
                {row.amount >= 0 ? "+" : ""}
                {row.amount}
              </span>
              <b>{row.description || row.type}</b>
              <small>{formatDate(row.createdAt, language)}</small>
            </div>
          ))}
          {transactions.length === 0 && (
            <div className="empty-state">
              {ar
                ? "لا توجد حركات رصيد بعد."
                : "There are no credit transactions yet."}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function WaliCenter({ language }: { language: Language }) {
  const ar = language === "ar"
  const [data, setData] = useState<ApiWaliData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [inviteUrl, setInviteUrl] = useState("")
  const [saving, setSaving] = useState(false)
  const [invitation, setInvitation] = useState({
    name: "",
    relation: "father" as "father" | "older_brother" | "paternal_uncle" | "maternal_uncle" | "other",
    phone: "",
    email: "",
  })
  const [permissions, setPermissions] = useState({
    viewMatchedCandidates: true,
    viewVerificationStatus: true,
    joinGroupChats: true,
    readDirectChats: false,
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await waliApi.get())
      setError("")
    } catch (reason) {
      setError(
        errorText(
          reason,
          ar ? "تعذّر تحميل بيانات الولي." : "Could not load wali data.",
        ),
      )
    } finally {
      setLoading(false)
    }
  }, [ar])

  useEffect(() => {
    void load()
  }, [load])

  const sendInvitation = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError("")
    setMessage("")
    setInviteUrl("")
    try {
      const result = await waliApi.invite({
        name: invitation.name.trim(),
        relation: invitation.relation,
        phone: invitation.phone.trim(),
        email: invitation.email.trim() || undefined,
        permissions,
      })
      setMessage(result.message)
      if (result.inviteUrl) setInviteUrl(result.inviteUrl)
      setInvitation({ name: "", relation: "father", phone: "", email: "" })
      await load()
    } catch (reason) {
      setError(
        errorText(
          reason,
          ar ? "تعذّر إرسال الدعوة." : "Could not send the invitation.",
        ),
      )
    } finally {
      setSaving(false)
    }
  }

  const revoke = async (id: string) => {
    setSaving(true)
    try {
      await waliApi.revoke(id)
      setMessage(ar ? "تم إلغاء ربط الولي." : "The wali link was revoked.")
      await load()
    } catch (reason) {
      setError(
        errorText(
          reason,
          ar ? "تعذّر إلغاء الربط." : "Could not revoke the link.",
        ),
      )
    } finally {
      setSaving(false)
    }
  }

  const relationLabels: Record<string, [string, string]> = {
    father: ["والد", "Father"],
    older_brother: ["أخ أكبر", "Older brother"],
    paternal_uncle: ["عم", "Paternal uncle"],
    maternal_uncle: ["خال", "Maternal uncle"],
    other: ["أحد أفراد الأسرة", "Family member"],
  }
  const permissionLabels: Record<string, [string, string]> = {
    viewMatchedCandidates: ["عرض الترشيحات المتطابقة", "View matched candidates"],
    viewVerificationStatus: ["عرض حالة التوثيق", "View verification status"],
    joinGroupChats: ["الانضمام إلى محادثة جماعية", "Join a group conversation"],
    readDirectChats: ["قراءة المحادثات المباشرة", "Read direct chats"],
  }
  const hasActive = Boolean(
    data?.links.some((link) => link.status === "active" || link.status === "pending"),
  )

  if (loading) return <LoadingCard language={language} />

  return (
    <div className="feature-page">
      <section className="feature-card">
        <div className="feature-heading">
          <div>
            <h2>
              {ar ? "مشاركة وليّك وأسرتك" : "Share with your wali and family"}
            </h2>
            <p>
              {ar
                ? "أضيفي شخصًا تثقين به، وحددي ما يمكنه رؤيته أو المشاركة فيه. يمكنك تعديل الصلاحيات أو إلغاء الدعوة في أي وقت."
                : "Add someone you trust and choose what they can see or take part in. You can change permissions or cancel the invitation at any time."}
            </p>
          </div>
        </div>
        {error && (
          <p className="inline-feedback" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="inline-feedback" role="status">
            {message}
          </p>
        )}
        {inviteUrl && (
          <p className="inline-feedback" dir="ltr">
            {inviteUrl}
          </p>
        )}
        {data?.links.map((link) => (
          <div className="wali-invitation" key={link.id}>
            <span>
              <Icon name="users" />
            </span>
            <div>
              <b>
                {link.wali.name} ·{" "}
                {ar
                  ? relationLabels[link.wali.relation]?.[0] ?? link.wali.relation
                  : relationLabels[link.wali.relation]?.[1] ?? link.wali.relation}
              </b>
              <small>
                {link.wali.phone} {link.wali.email && `· ${link.wali.email}`}
              </small>
              <small>
                {link.status === "active"
                  ? ar
                    ? "ربط نشط"
                    : "Active link"
                  : ar
                    ? "بانتظار قبول الدعوة"
                    : "Waiting for invitation acceptance"}
              </small>
              <div className="tags">
                {link.permissions &&
                  Object.entries(link.permissions)
                    .filter(([, value]) => value)
                    .map(([key]) => (
                      <span key={key}>
                        {ar
                          ? permissionLabels[key]?.[0] ?? key
                          : permissionLabels[key]?.[1] ?? key}
                      </span>
                    ))}
              </div>
            </div>
            <Button
              kind="outline"
              disabled={saving}
              onClick={() => void revoke(link.id)}
            >
              {ar ? "إلغاء الربط" : "Revoke link"}
            </Button>
          </div>
        ))}
        {data?.invitations.map((item) => (
          <div className="wali-invitation" key={item.id}>
            <span>
              <Icon name="clock" />
            </span>
            <div>
              <b>{item.phone}</b>
              <small>
                {ar ? "دعوة معلّقة · تنتهي " : "Pending invitation · expires "}
                {formatDate(item.expiresAt, language)}
              </small>
            </div>
          </div>
        ))}
        {!hasActive && (
          <form className="feature-form" onSubmit={sendInvitation}>
            <div className="form-grid">
              <label>
                {ar ? "اسم ولي الأمر" : "Wali's name"}
                <input
                  required
                  value={invitation.name}
                  onChange={(event) =>
                    setInvitation({ ...invitation, name: event.target.value })
                  }
                  placeholder={ar ? "الاسم" : "Name"}
                />
              </label>
              <label>
                {ar ? "صلة القرابة" : "Relationship"}
                <select
                  value={invitation.relation}
                  onChange={(event) =>
                    setInvitation({
                      ...invitation,
                      relation: event.target.value as typeof invitation.relation,
                    })
                  }
                >
                  {Object.entries(relationLabels).map(([key, label]) => (
                    <option value={key} key={key}>
                      {ar ? label[0] : label[1]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {ar ? "رقم الهاتف" : "Phone number"}
                <input
                  required
                  type="tel"
                  value={invitation.phone}
                  onChange={(event) =>
                    setInvitation({ ...invitation, phone: event.target.value })
                  }
                  placeholder="+20"
                />
              </label>
              <label>
                {ar ? "البريد الإلكتروني (اختياري)" : "Email (optional)"}
                <input
                  type="email"
                  value={invitation.email}
                  onChange={(event) =>
                    setInvitation({ ...invitation, email: event.target.value })
                  }
                  placeholder="name@example.com"
                />
              </label>
            </div>
            <fieldset className="permission-options">
              <legend>
                {ar ? "الصلاحيات التي أوافق عليها" : "Permissions I approve"}
              </legend>
              {Object.entries(permissionLabels).map(([key, label]) => (
                <label key={key}>
                  <input
                    type="checkbox"
                    checked={permissions[key as keyof typeof permissions]}
                    onChange={() =>
                      setPermissions((current) => ({
                        ...current,
                        [key]: !current[key as keyof typeof current],
                      }))
                    }
                  />
                  {ar ? label[0] : label[1]}
                </label>
              ))}
            </fieldset>
            <Button icon="send" disabled={saving}>
              {saving
                ? ar
                  ? "جارٍ الإرسال…"
                  : "Sending…"
                : ar
                  ? "إرسال دعوة الولي"
                  : "Send wali invitation"}
            </Button>
          </form>
        )}
      </section>
      <section className="feature-card">
        <div className="feature-heading">
          <div>
            <h2>{ar ? "كيف تعمل مشاركة الولي؟" : "How wali sharing works"}</h2>
            <p>
              {ar
                ? "لا يمكن للولي الوصول إلى أي معلومات أو محادثة دون موافقتك وصلاحية محددة."
                : "Your wali cannot access any information or conversation without your consent and a specific permission."}
            </p>
          </div>
        </div>
        <div className="wali-steps">
          <span>{ar ? "١ · ترسلين الدعوة" : "1 · You send the invitation"}</span>
          <span>{ar ? "٢ · يوافق وليّك" : "2 · Your wali accepts"}</span>
          <span>{ar ? "٣ · تختارين الصلاحيات" : "3 · You choose permissions"}</span>
        </div>
      </section>
    </div>
  )
}

function Community({ language }: { language: Language }) {
  const ar = language === "ar"
  const [topics, setTopics] = useState<ApiCommunityTopic[]>([])
  const [topic, setTopic] = useState("all")
  const [posts, setPosts] = useState<ApiCommunityPost[]>([])
  const [draft, setDraft] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [sending, setSending] = useState(false)

  const loadPosts = useCallback(
    async (topicKey: string) => {
      try {
        const result = await communityApi.posts({
          ...(topicKey !== "all" ? { topic: topicKey } : {}),
          limit: 20,
        })
        setPosts(result.results)
        setError("")
      } catch (reason) {
        setError(
          errorText(
            reason,
            ar ? "تعذّر تحميل المشاركات." : "Could not load posts.",
          ),
        )
      }
    },
    [ar],
  )

  useEffect(() => {
    void (async () => {
      setLoading(true)
      try {
        const result = await communityApi.topics()
        setTopics(result.topics)
      } catch (reason) {
        setError(
          errorText(
            reason,
            ar ? "تعذّر تحميل أقسام المجتمع." : "Could not load community topics.",
          ),
        )
      } finally {
        setLoading(false)
      }
      await loadPosts("all")
    })()
  }, [ar, loadPosts])

  const chooseTopic = async (key: string) => {
    setTopic(key)
    setLoading(true)
    await loadPosts(key)
    setLoading(false)
  }

  const createPost = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!draft.trim()) return
    setSending(true)
    setError("")
    setNotice("")
    try {
      const selected = topics.find((item) => item.key === topic)
      const result = await communityApi.createPost({
        body: draft.trim(),
        ...(selected ? { topicId: selected.id } : {}),
      })
      setDraft("")
      setNotice(result.message)
      await loadPosts(topic)
    } catch (reason) {
      setError(
        errorText(
          reason,
          ar ? "تعذّر نشر المشاركة." : "Could not publish your post.",
        ),
      )
    } finally {
      setSending(false)
    }
  }

  const react = async (post: ApiCommunityPost, kind: "like" | "bookmark") => {
    try {
      const result = await communityApi.react(post.id, kind)
      setPosts((current) =>
        current.map((item) =>
          item.id === post.id
            ? {
                ...item,
                liked: kind === "like" ? result.active : item.liked,
                bookmarked: kind === "bookmark" ? result.active : item.bookmarked,
                likeCount:
                  kind === "like"
                    ? item.likeCount + (result.active ? 1 : -1)
                    : item.likeCount,
              }
            : item,
        ),
      )
    } catch (reason) {
      setError(
        errorText(reason, ar ? "تعذّر تسجيل التفاعل." : "Could not save reaction."),
      )
    }
  }

  const addComment = async (post: ApiCommunityPost) => {
    const text = window.prompt(
      ar ? "اكتب تعليقك:" : "Write your comment:",
    )
    if (!text?.trim()) return
    try {
      await communityApi.comment(post.id, text.trim())
      setNotice(ar ? "تم إضافة تعليقك." : "Your comment was added.")
      await loadPosts(topic)
    } catch (reason) {
      setError(
        errorText(reason, ar ? "تعذّر إضافة التعليق." : "Could not add comment."),
      )
    }
  }

  const report = async (post: ApiCommunityPost) => {
    const details = window.prompt(
      ar ? "اذكر سبب البلاغ (اختياري):" : "Describe the reason (optional):",
    )
    try {
      const result = await discoveryApi.report({
        targetType: "post",
        targetId: post.id,
        details: details?.trim() || undefined,
      })
      setNotice(
        ar
          ? `تم استلام البلاغ برقم ${result.report.reference}.`
          : `Report received with reference ${result.report.reference}.`,
      )
    } catch (reason) {
      setError(
        errorText(reason, ar ? "تعذّر إرسال البلاغ." : "Could not send report."),
      )
    }
  }

  return (
    <div className="feature-page">
      <section className="feature-card">
        <div className="feature-heading">
          <div>
            <h2>
              {ar
                ? "مجتمع يساند رحلة واعية"
                : "A community for a thoughtful journey"}
            </h2>
            <p>
              {ar
                ? "شاركي الخبرات والنصائح باحترام. لا تنشري معلومات اتصال أو بيانات شخصية."
                : "Share experiences and advice respectfully. Do not post contact details or personal information."}
            </p>
          </div>
        </div>
        <div className="topic-pills">
          <button
            className={topic === "all" ? "active" : ""}
            onClick={() => void chooseTopic("all")}
          >
            {ar ? "الكل" : "All"}
          </button>
          {topics.map((item) => (
            <button
              className={topic === item.key ? "active" : ""}
              key={item.id}
              onClick={() => void chooseTopic(item.key)}
            >
              {item.nameAr}
            </button>
          ))}
        </div>
        <form className="community-compose" onSubmit={createPost}>
          <label htmlFor="community-post">
            {ar ? "ابدئي نقاشًا مفيدًا" : "Start a helpful discussion"}
          </label>
          <textarea
            id="community-post"
            required
            maxLength={3000}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={
              ar
                ? "اكتبي فكرتك أو سؤالك باحترام..."
                : "Write your idea or question respectfully..."
            }
          />
          <div>
            <small>{draft.length}/3000</small>
            <Button icon="send" disabled={sending}>
              {sending
                ? ar
                  ? "جارٍ النشر…"
                  : "Publishing…"
                : ar
                  ? "نشر المشاركة"
                  : "Publish post"}
            </Button>
          </div>
        </form>
        {error && (
          <p className="inline-feedback" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="inline-feedback" role="status">
            {notice}
          </p>
        )}
      </section>
      <section className="community-feed">
        {loading && <LoadingCard language={language} />}
        {!loading &&
          posts.map((post) => (
            <article className="feature-card community-post" key={post.id}>
              <div className="post-meta">
                <span className="post-avatar">
                  {post.author.photo ? (
                    <SafeImage
                      src={post.author.photo}
                      alt=""
                      fallback={<Icon name="user" />}
                    />
                  ) : (
                    <Icon name="user" />
                  )}
                </span>
                <div>
                  <b>{post.author.name}</b>
                  <small>
                    {post.topic?.nameAr ?? (ar ? "عام" : "General")} ·{" "}
                    {formatDateTime(post.publishedAt ?? post.createdAt, language)}
                  </small>
                </div>
                <button className="report-link" onClick={() => void report(post)}>
                  {ar ? "إبلاغ" : "Report"}
                </button>
              </div>
              <p>{post.body}</p>
              <div className="post-actions">
                <button onClick={() => void react(post, "like")}>
                  <Icon name="heart" size={16} />
                  {post.likeCount} {ar ? "إعجاب" : "likes"}
                </button>
                <button onClick={() => void addComment(post)}>
                  <Icon name="chat" size={16} />
                  {post.comments} {ar ? "تعليق" : "comments"}
                </button>
                <button onClick={() => void react(post, "bookmark")}>
                  <Icon name="book" size={16} />
                  {post.bookmarkCount}
                </button>
              </div>
            </article>
          ))}
        {!loading && posts.length === 0 && (
          <div className="empty-state">
            {ar
              ? "لا توجد مشاركات في هذا القسم بعد."
              : "There are no posts in this section yet."}
          </div>
        )}
      </section>
    </div>
  )
}

function CallHistory({ language }: { language: Language }) {
  const ar = language === "ar"
  const [calls, setCalls] = useState<ApiCall[]>([])
  const [matches, setMatches] = useState<Array<{ id: string; user: ApiCard }>>([])
  const [receiverId, setReceiverId] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [starting, setStarting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [callList, matchList] = await Promise.all([
        callsApi.list({ limit: 30 }),
        discoveryApi.matches(),
      ])
      setCalls(callList.results)
      setMatches(matchList.results)
      setReceiverId((current) => current || matchList.results[0]?.user.id || "")
      setError("")
    } catch (reason) {
      setError(
        errorText(
          reason,
          ar ? "تعذّر تحميل المكالمات." : "Could not load calls.",
        ),
      )
    } finally {
      setLoading(false)
    }
  }, [ar])

  useEffect(() => {
    void load()
  }, [load])

  const startCall = async (type: "voice" | "video") => {
    if (!receiverId) {
      setError(
        ar
          ? "تحتاج إلى تطابق نشط لبدء مكالمة."
          : "You need an active match to start a call.",
      )
      return
    }
    setStarting(true)
    setError("")
    setNotice("")
    try {
      const result = await callsApi.start(receiverId, type)
      setNotice(
        ar
          ? `بدأت المكالمة بسعر ${result.call.ratePerMinute} رصيد/دقيقة.`
          : `Call started at ${result.call.ratePerMinute} credits/minute.`,
      )
      await load()
    } catch (reason) {
      setError(
        errorText(reason, ar ? "تعذّر بدء المكالمة." : "Could not start the call."),
      )
    } finally {
      setStarting(false)
    }
  }

  const statusLabel = (status: string) => {
    const labels: Record<string, [string, string]> = {
      ringing: ["يرن", "Ringing"],
      active: ["جارية", "Active"],
      completed: ["مكتملة", "Completed"],
      missed: ["فائتة", "Missed"],
      rejected: ["مرفوضة", "Rejected"],
      failed: ["فشلت", "Failed"],
    }
    return ar ? labels[status]?.[0] ?? status : labels[status]?.[1] ?? status
  }

  if (loading) return <LoadingCard language={language} />

  return (
    <div className="feature-page">
      <section className="feature-card">
        <div className="feature-heading">
          <div>
            <h2>{ar ? "تواصل بموافقة متبادلة" : "Connect with mutual consent"}</h2>
            <p>
              {ar
                ? "المكالمات متاحة بعد التطابق والمحادثة، ويمكن إنهاؤها أو الإبلاغ عنها في أي وقت."
                : "Calls are available after a match and conversation, and can be ended or reported at any time."}
            </p>
          </div>
        </div>
        {matches.length > 0 ? (
          <>
            <label className="onboarding-select">
              {ar ? "اختاري من تتصلين به" : "Choose who to call"}
              <select
                value={receiverId}
                onChange={(event) => setReceiverId(event.target.value)}
              >
                {matches.map((match) => (
                  <option value={match.user.id} key={match.id}>
                    {match.user.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="call-options">
              <article>
                <Icon name="phone" size={24} />
                <b>{ar ? "مكالمة صوتية" : "Voice call"}</b>
                <p>
                  {ar
                    ? "تُحسب المكالمة من رصيدك حسب تعريفة المكالمات."
                    : "The call is charged from your balance at the published rate."}
                </p>
                <Button disabled={starting} onClick={() => void startCall("voice")}>
                  {ar ? "بدء مكالمة صوتية" : "Start voice call"}
                </Button>
              </article>
              <article>
                <Icon name="video" size={24} />
                <b>{ar ? "مكالمة مرئية" : "Video call"}</b>
                <p>
                  {ar
                    ? "تأكدي من إعدادات الكاميرا والميكروفون قبل البدء."
                    : "Check your camera and microphone before starting."}
                </p>
                <Button
                  kind="outline"
                  disabled={starting}
                  onClick={() => void startCall("video")}
                >
                  {ar ? "بدء مكالمة مرئية" : "Start video call"}
                </Button>
              </article>
            </div>
          </>
        ) : (
          <div className="empty-state">
            {ar
              ? "لا توجد تطابقات نشطة بعد. ستظهر المكالمات بعد قبول اهتمام متبادل."
              : "There are no active matches yet. Calls become available after a mutual interest."}
          </div>
        )}
        {error && (
          <p className="inline-feedback" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="inline-feedback" role="status">
            {notice}
          </p>
        )}
      </section>
      <section className="feature-card">
        <div className="feature-heading">
          <div>
            <h2>{ar ? "سجل المكالمات" : "Call history"}</h2>
            <p>
              {ar
                ? "سجل المكالمات المسجّلة على حسابك."
                : "Calls recorded on your account."}
            </p>
          </div>
        </div>
        <div className="ledger-list">
          {calls.map((call) => (
            <div key={call.id}>
              <span className="call-type">
                <Icon name={call.type === "voice" ? "phone" : "video"} size={16} />
              </span>
              <b>
                {call.user.name} ·{" "}
                {call.type === "voice"
                  ? ar
                    ? "صوتية"
                    : "Voice"
                  : ar
                    ? "مرئية"
                    : "Video"}{" "}
                · {statusLabel(call.status)}
              </b>
              <small>
                {Math.floor(call.durationSeconds / 60)}:
                {String(call.durationSeconds % 60).padStart(2, "0")} ·{" "}
                {formatDateTime(call.createdAt, language)} · {call.creditsConsumed}{" "}
                {ar ? "رصيد" : "credits"}
              </small>
            </div>
          ))}
          {calls.length === 0 && (
            <div className="empty-state">
              {ar ? "لا توجد مكالمات بعد." : "There are no calls yet."}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function ProfileCard({
  profile,
  language = "ar",
}: {
  profile: ApiCard
  language?: Language
}) {
  const ar = language === "ar"
  const [saved, setSaved] = useState(false)
  const [interested, setInterested] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState("")

  const act = async (action: "favorite" | "like") => {
    setBusy(true)
    setNotice("")
    try {
      const result = await discoveryApi.like({ targetId: profile.id, action })
      if (action === "favorite") setSaved(true)
      else {
        setInterested(true)
        setNotice(
          result.matched
            ? ar
              ? "تم إرسال الاهتمام — يوجد تطابق متبادل الآن."
              : "Interest sent — you have a mutual match now."
            : ar
              ? "تم إرسال اهتمامك."
              : "Your interest was sent.",
        )
      }
    } catch (reason) {
      setNotice(
        errorText(reason, ar ? "تعذّر إتمام الإجراء." : "Could not complete action."),
      )
    } finally {
      setBusy(false)
    }
  }

  const place = [profile.city, profile.country].filter(Boolean).join("، ") || (ar ? "غير محدد" : "Not set")
  const job = profile.profession || (ar ? "غير محدد" : "Not set")
  const tags = profile.interests.slice(0, 3)
  const ageLabel = profile.age ? `${profile.age}` : ""

  return (
    <article className="profile-card">
      <div className="profile-image">
        {profile.photo ? (
          <SafeImage
            src={profile.photo}
            alt={ar ? `صورة ${profile.name}` : `${profile.name}'s photo`}
            fallback={
              <span className="photo-fallback">
                <Icon name="user" size={42} />
              </span>
            }
          />
        ) : (
          <span className="photo-fallback">
            <Icon name="user" size={42} />
          </span>
        )}
        <span className="score">
          <Icon name="sparkles" size={14} />
          {profile.score}% {ar ? "توافق" : "match"}
        </span>
        <button
          className={`heart-button ${saved ? "saved" : ""}`}
          aria-label={ar ? "حفظ الملف" : "Save profile"}
          aria-pressed={saved}
          disabled={busy || saved}
          onClick={() => void act("favorite")}
        >
          <Icon name="heart" />
        </button>
      </div>
      <div className="profile-body">
        <div className="profile-name">
          <h3>
            {profile.name}
            {ageLabel && <small> · {ageLabel}</small>}
          </h3>
          {profile.verified && (
            <span title={ar ? "حساب موثّق" : "Verified account"}>
              <Icon name="check" size={13} />
            </span>
          )}
        </div>
        <p>
          <Icon name="location" size={16} />
          {place}
          <i /> <Icon name="briefcase" size={16} />
          {job}
        </p>
        {tags.length > 0 && (
          <div className="tags">
            {tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        )}
        {showDetails && (
          <div className="profile-detail-panel">
            <b>{ar ? "نبذة تعريفية" : "Introduction"}</b>
            <p>
              {profile.bio ||
                (ar
                  ? "لم يضف هذا المستخدم نبذة بعد."
                  : "This user has not added a bio yet.")}
            </p>
            <small>
              {[profile.education, profile.maritalStatus, profile.heightCm && `${profile.heightCm} cm`]
                .filter(Boolean)
                .join(" · ") || (ar ? "بيانات إضافية غير متاحة" : "No extra details")}
              {" · "}
              {profile.lastActiveAt
                ? ar
                  ? `آخر ظهور ${formatDate(profile.lastActiveAt, language)}`
                  : `Last seen ${formatDate(profile.lastActiveAt, language)}`
                : ar
                  ? "غير متصل الآن"
                  : "Offline now"}
            </small>
          </div>
        )}
        {notice && (
          <p className="inline-feedback" role="status">
            {notice}
          </p>
        )}
        <div className="card-actions">
          <Button kind="soft" onClick={() => setShowDetails(!showDetails)}>
            {showDetails
              ? ar
                ? "إخفاء التفاصيل"
                : "Hide details"
              : ar
                ? "عرض الملف"
                : "View profile"}
          </Button>
          <Button
            kind={interested ? "soft" : "primary"}
            disabled={busy || interested}
            onClick={() => void act("like")}
          >
            {interested
              ? ar
                ? "تم إرسال الاهتمام"
                : "Interest sent"
              : ar
                ? "إرسال اهتمام"
                : "Send interest"}
          </Button>
        </div>
      </div>
    </article>
  )
}

const navItems: [IconName, string, string, string][] = [
  ["home", "الرئيسية", "Home", "dashboard"],
  ["sparkles", "الترشيحات", "Recommendations", "matches"],
  ["search", "البحث", "Search", "search"],
  ["heart", "الاهتمامات", "Interests", "interests"],
  ["wallet", "محفظة الرصيد", "Credit wallet", "wallet"],
  ["users", "الولي والأسرة", "Wali & family", "wali"],
  ["book", "المجتمع", "Community", "community"],
  ["chat", "الرسائل", "Messages", "messages"],
  ["phone", "المكالمات", "Calls", "calls"],
  ["bell", "الإشعارات", "Notifications", "notifications"],
  ["user", "ملفي الشخصي", "My profile", "profile"],
  ["settings", "الإعدادات", "Settings", "settings"],
]

function Sidebar({
  view,
  setView,
  exit,
  logout,
  language,
  unreadMessages,
}: {
  view: string
  setView: (v: string) => void
  exit: () => void
  logout?: () => Promise<void>
  language: Language
  unreadMessages: number
}) {
  const ar = language === "ar"
  return (
    <aside className="sidebar">
      <Logo language={language} />
      <nav>
        {navItems.map(([icon, arLabel, enLabel, key]) => (
          <button
            key={key}
            className={view === key ? "active" : ""}
            onClick={() => setView(key)}
          >
            <Icon name={icon} />
            <span>{ar ? arLabel : enLabel}</span>
            {key === "messages" && unreadMessages > 0 && (
              <b>{unreadMessages > 9 ? "9+" : unreadMessages}</b>
            )}
          </button>
        ))}
      </nav>
      <div className="side-safety">
        <Icon name="shield" />
        <b>{ar ? "تذكّر دائمًا" : "Always remember"}</b>
        <p>
          {ar
            ? "لا تشارك بياناتك الخاصة قبل بناء الثقة."
            : "Do not share private information before trust is built."}
        </p>
        <a>{ar ? "إرشادات الأمان" : "Safety guidance"}</a>
      </div>
      <button
        className="signout"
        onClick={() => {
          void (async () => {
            await logout?.()
            exit()
          })()
        }}
      >
        {ar ? "تسجيل الخروج" : "Sign out"}
      </button>
    </aside>
  )
}

export default function UserDashboard({
  exit,
  language,
  user,
  logout,
}: {
  exit: () => void
  language: Language
  user?: WebUser | null
  logout?: () => Promise<void>
}) {
  const ar = language === "ar"
  const [view, setView] = useState("dashboard")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [unreadNotifications, setUnreadNotifications] = useState(0)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const [full, unread, notificationData] = await Promise.all([
          profileApi.get(),
          messagingApi.unreadCount(),
          notificationsApi.list({ unread: true, limit: 1 }),
        ])
        if (cancelled) return
        setAvatarUrl(
          full.photos.find((photo) => photo.isPrimary)?.url ??
            full.photos[0]?.url ??
            "",
        )
        setUnreadMessages(unread.unread)
        setUnreadNotifications(notificationData.unread)
      } catch {
        // Header enrichment is optional; keep the dashboard usable.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const firstName = user?.firstName?.trim()
  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    user?.phone ||
    (ar ? "سارة محمد" : "Sara Mohamed")
  const greetingName =
    firstName || (user ? (ar ? "بك" : "there") : ar ? "سارة" : "Sara")
  const titles: Record<string, string> = {
    dashboard: ar
      ? `مساء الخير، ${greetingName}`
      : `Good evening, ${greetingName}`,
    matches: ar ? "ترشيحاتك اليوم" : "Your recommendations today",
    search: ar ? "البحث المتقدم" : "Advanced search",
    interests: ar ? "الاهتمامات" : "Interests",
    wallet: ar ? "محفظة الرصيد" : "Credit wallet",
    wali: ar ? "الولي والأسرة" : "Wali & family",
    community: ar ? "مجتمع شريك العمر" : "Sharik Alomr community",
    calls: ar ? "المكالمات" : "Calls",
    messages: ar ? "الرسائل" : "Messages",
    notifications: ar ? "الإشعارات" : "Notifications",
    profile: ar ? "ملفي الشخصي" : "My profile",
    settings: ar ? "الخصوصية والإعدادات" : "Privacy & settings",
  }
  return (
    <div className="app-shell" dir={ar ? "rtl" : "ltr"}>
      <Sidebar
        view={view}
        setView={setView}
        exit={exit}
        logout={logout}
        language={language}
        unreadMessages={unreadMessages}
      />
      <div className="app-main">
        <header className="app-header">
          <div>
            <button className="mobile-menu">
              <Icon name="menu" />
            </button>
            <h1>{titles[view]}</h1>
            <p>
              {view === "dashboard"
                ? ar
                  ? "نتمنى لك رحلة هادئة نحو الاختيار الأنسب"
                  : "We wish you a calm journey toward the right choice"
                : ar
                  ? "أدِر تجربتك بكل وضوح وخصوصية"
                  : "Manage your experience with clarity and privacy"}
            </p>
          </div>
          <div className="app-header-actions">
            <button
              className="icon-btn"
              onClick={() => setView("notifications")}
              aria-label={ar ? "الإشعارات" : "Notifications"}
            >
              <Icon name="bell" />
              {unreadNotifications > 0 && <i />}
            </button>
            <button className="mini-profile" onClick={() => setView("profile")}>
              {avatarUrl ? (
                <SafeImage
                  src={avatarUrl}
                  alt=""
                  fallback={
                    <span className="mini-profile-avatar">
                      <Icon name="user" size={20} />
                    </span>
                  }
                />
              ) : (
                <span className="mini-profile-avatar">
                  <Icon name="user" size={20} />
                </span>
              )}
              <span>
                <b>{displayName}</b>
                <small>
                  {user?.isVerifiedBadge
                    ? ar
                      ? "حساب موثّق"
                      : "Verified account"
                    : user?.phone || (ar ? "حسابك" : "Your account")}
                </small>
              </span>
            </button>
          </div>
        </header>
        <div className="app-content">
          {view === "dashboard" && (
            <DashboardHome
              key={language}
              setView={setView}
              language={language}
            />
          )}{" "}
          {(view === "matches" || view === "search") && (
            <SearchView
              key={language}
              search={view === "search"}
              language={language}
            />
          )}{" "}
          {view === "interests" && (
            <Interests key={language} language={language} />
          )}{" "}
          {view === "messages" && (
            <Messages key={language} language={language} />
          )}{" "}
          {view === "notifications" && (
            <Notifications key={language} language={language} />
          )}{" "}
          {view === "wallet" && <Wallet key={language} language={language} />}{" "}
          {view === "wali" && <WaliCenter key={language} language={language} />}{" "}
          {view === "community" && (
            <Community key={language} language={language} />
          )}{" "}
          {view === "calls" && (
            <CallHistory key={language} language={language} />
          )}{" "}
          {(view === "settings" || view === "profile") && (
            <Settings
              key={language}
              profile={view === "profile"}
              language={language}
            />
          )}
        </div>
        <BottomNav view={view} setView={setView} language={language} />
      </div>
    </div>
  )
}

function DashboardHome({
  setView,
  language,
}: {
  setView: (v: string) => void
  language: Language
}) {
  const ar = language === "ar"
  const [data, setData] = useState<Awaited<ReturnType<typeof discoveryApi.dashboard>> | null>(null)
  const [activity, setActivity] = useState<ApiNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    void (async () => {
      setLoading(true)
      try {
        const [dashboard, notifications] = await Promise.all([
          discoveryApi.dashboard(),
          notificationsApi.list({ limit: 3 }),
        ])
        setData(dashboard)
        setActivity(notifications.results)
        setError("")
      } catch (reason) {
        setError(
          errorText(
            reason,
            ar ? "تعذّر تحميل لوحة البداية." : "Could not load your dashboard.",
          ),
        )
      } finally {
        setLoading(false)
      }
    })()
  }, [ar])

  if (loading) return <LoadingCard language={language} />
  if (!data) {
    return (
      <div className="empty-state">
        {error || (ar ? "تعذّر تحميل البيانات." : "Could not load data.")}
      </div>
    )
  }

  const completion = data.completion.percent
  const iconFor = (type: string): IconName => {
    if (type === "match") return "check"
    if (type === "interest") return "heart"
    if (type === "message") return "chat"
    if (type === "verification") return "shield"
    if (type === "call") return "phone"
    return "bell"
  }

  return (
    <>
      {error && (
        <p className="inline-feedback" role="alert">
          {error}
        </p>
      )}
      <section className="welcome-banner">
        <div>
          <span>{ar ? "خطوة صغيرة كل يوم" : "One small step every day"}</span>
          <h2>
            {ar ? "ملفك مكتمل بنسبة" : "Your profile is"} <b>{completion}%</b>{" "}
            {ar ? "" : "complete"}
          </h2>
          <p>
            {ar
              ? completion < 100
                ? "أكملي بيانات ملفك لتحصلي على ترشيحات أكثر دقة."
                : "ملفك مكتمل — حافظي على تحديث بياناتك."
              : completion < 100
                ? "Complete your profile to receive more accurate recommendations."
                : "Your profile is complete — keep your details up to date."}
          </p>
          <Button kind="light" onClick={() => setView("profile")}>
            {completion < 100
              ? ar
                ? "استكمال الملف"
                : "Complete profile"
              : ar
                ? "مراجعة الملف"
                : "Review profile"}
          </Button>
        </div>
        <div className="progress-ring">
          <b>{completion}%</b>
          <small>{ar ? "مكتمل" : "complete"}</small>
        </div>
      </section>
      <div className="stats-grid">
        <article>
          <span className="stat-icon purple">
            <Icon name="sparkles" />
          </span>
          <div>
            <small>{ar ? "ترشيحات جديدة" : "New recommendations"}</small>
            <b>{data.counts.recommendations}</b>
            <em>{ar ? "متاحة الآن" : "available now"}</em>
          </div>
        </article>
        <article>
          <span className="stat-icon rose">
            <Icon name="heart" />
          </span>
          <div>
            <small>{ar ? "اهتمامات مستلمة" : "Interests received"}</small>
            <b>{data.counts.interestsReceived}</b>
            <em>{ar ? "خلال ٧ أيام" : "last 7 days"}</em>
          </div>
        </article>
        <article>
          <span className="stat-icon green">
            <Icon name="check" />
          </span>
          <div>
            <small>{ar ? "تطابقات متبادلة" : "Mutual matches"}</small>
            <b>{data.counts.matches}</b>
            <em>{ar ? "تواصل متاح" : "chat available"}</em>
          </div>
        </article>
      </div>
      <div className="content-row">
        <section className="recommendations">
          <div className="block-heading">
            <div>
              <h2>
                {ar ? "ترشيحات قد تناسبك" : "Recommendations you may like"}
              </h2>
              <p>
                {ar
                  ? "بناءً على معاييرك واهتماماتك"
                  : "Based on your criteria and interests"}
              </p>
            </div>
            <button onClick={() => setView("matches")}>
              {ar ? "عرض الكل" : "View all"} <Icon name="arrow" size={16} />
            </button>
          </div>
          <div className="mini-profile-grid">
            {data.recommendations.slice(0, 2).map((profile) => (
              <ProfileCard key={profile.id} profile={profile} language={language} />
            ))}
            {data.recommendations.length === 0 && (
              <div className="empty-state">
                {ar
                  ? "لا توجد ترشيحات جديدة الآن. وسّعي نطاق العمر أو المدينة من البحث."
                  : "No new recommendations right now. Widen your age or city range in search."}
              </div>
            )}
          </div>
        </section>
        <aside className="activity-panel">
          <div className="block-heading">
            <h2>{ar ? "آخر النشاطات" : "Recent activity"}</h2>
          </div>
          {activity.map((item) => (
            <div className="activity" key={item.id}>
              <span>
                <Icon name={iconFor(item.type)} />
              </span>
              <div>
                <b>{item.title}</b>
                <p>{item.body}</p>
                <small>{formatDateTime(item.createdAt, language)}</small>
              </div>
            </div>
          ))}
          {activity.length === 0 && (
            <div className="empty-state">
              {ar ? "لا توجد نشاطات بعد." : "No activity yet."}
            </div>
          )}
        </aside>
      </div>
      <div className="safety-reminder">
        <Icon name="shield" />
        <div>
          <b>
            {ar
              ? "خصوصيتك مسؤوليتنا المشتركة"
              : "Your privacy is our shared responsibility"}
          </b>
          <p>
            {ar
              ? "لا ترسلي بيانات التواصل أو التحويلات المالية لأي شخص. أبلغينا فورًا عن أي سلوك غير مريح."
              : "Never send contact details or money to anyone. Report any uncomfortable behavior immediately."}
          </p>
        </div>
        <button onClick={() => setView("settings")}>
          {ar ? "عرض نصائح الأمان" : "View safety tips"}
        </button>
      </div>
    </>
  )
}

function SearchView({
  search,
  language,
}: {
  search: boolean
  language: Language
}) {
  const ar = language === "ar"
  const [query, setQuery] = useState("")
  const [minAge, setMinAge] = useState(25)
  const [maxAge, setMaxAge] = useState(36)
  const [city, setCity] = useState("")
  const [education, setEducation] = useState("")
  const [marital, setMarital] = useState("")
  const [sort, setSort] = useState<"best" | "newest">("best")
  const [savedOnly, setSavedOnly] = useState(false)
  const [results, setResults] = useState<ApiCard[]>([])
  const [favorites, setFavorites] = useState<
    Array<{ id: string; createdAt: string; user: ApiCard }>
  >([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [favoriteBusy, setFavoriteBusy] = useState<string | null>(null)

  const educationOptions = [
    { value: "bachelor", ar: "جامعي", en: "University" },
    { value: "master", ar: "دراسات عليا", en: "Postgraduate" },
    { value: "phd", ar: "دكتوراه", en: "Doctorate" },
    { value: "high_school", ar: "ثانوي", en: "Secondary" },
    { value: "other", ar: "أخرى", en: "Other" },
  ]
  const maritalOptions = [
    { value: "single", ar: "لم يسبق له/لها الزواج", en: "Never married" },
    { value: "divorced", ar: "مطلق/ـة", en: "Divorced" },
    { value: "widowed", ar: "أرمل/ـة", en: "Widowed" },
  ]

  const loadFavorites = useCallback(async () => {
    try {
      const data = await discoveryApi.favorites()
      setFavorites(data.results)
      setError("")
    } catch (reason) {
      setError(
        errorText(
          reason,
          ar
            ? "تعذّر تحميل الملفات المحفوظة."
            : "Could not load saved profiles.",
        ),
      )
    }
  }, [ar])

  useEffect(() => {
    if (savedOnly) void loadFavorites()
  }, [savedOnly, loadFavorites])

  useEffect(() => {
    if (savedOnly) return
    let cancelled = false
    const timer = window.setTimeout(() => {
      void (async () => {
        setLoading(true)
        try {
          const data = await discoveryApi.search({
            q: query.trim() || undefined,
            ageMin: minAge,
            ageMax: maxAge,
            city: city.trim() || undefined,
            education: education || undefined,
            maritalStatus: marital || undefined,
            page,
            limit: 12,
          })
          if (cancelled) return
          setResults(data.results)
          setTotal(data.total)
          setPages(data.pages)
          setError("")
        } catch (reason) {
          if (!cancelled)
            setError(
              errorText(
                reason,
                ar ? "تعذّر تنفيذ البحث." : "Could not run the search.",
              ),
            )
        } finally {
          if (!cancelled) setLoading(false)
        }
      })()
    }, 300)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [query, minAge, maxAge, city, education, marital, page, savedOnly, ar])

  const reset = () => {
    setQuery("")
    setMinAge(25)
    setMaxAge(36)
    setCity("")
    setEducation("")
    setMarital("")
    setPage(1)
    setSort("best")
  }

  const removeFavorite = async (targetId: string) => {
    setFavoriteBusy(targetId)
    setError("")
    try {
      await discoveryApi.removeFavorite(targetId)
      setFavorites((current) =>
        current.filter((entry) => entry.user.id !== targetId),
      )
    } catch (reason) {
      setError(
        errorText(
          reason,
          ar
            ? "تعذّرت إزالة الملف من المحفوظات."
            : "Could not remove the saved profile.",
        ),
      )
    } finally {
      setFavoriteBusy(null)
    }
  }

  const sorted = [...results].sort((a, b) => {
    if (sort === "newest") {
      return (
        new Date(b.lastActiveAt || 0).getTime() -
        new Date(a.lastActiveAt || 0).getTime()
      )
    }
    return b.score - a.score
  })
  const resultCount = savedOnly ? favorites.length : total

  return (
    <div className="search-layout">
      <aside className="filters">
        <div className="block-heading">
          <h2>
            <Icon name="sliders" /> {ar ? "تصفية النتائج" : "Filter results"}
          </h2>
          <button onClick={reset}>{ar ? "إعادة ضبط" : "Reset"}</button>
        </div>
        <label>
          {ar ? "بحث بالكلمة" : "Keyword search"}
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setPage(1)
            }}
            placeholder={ar ? "الاسم أو المهنة أو النبذة" : "Name, profession or bio"}
          />
        </label>
        <label>
          {ar ? "الفئة العمرية" : "Age range"}
          <div className="range-inputs">
            <input
              type="number"
              min="18"
              max={maxAge}
              aria-label={ar ? "أقل عمر" : "Minimum age"}
              value={minAge}
              onChange={(event) => {
                setMinAge(
                  Math.max(18, Math.min(Number(event.target.value), maxAge)),
                )
                setPage(1)
              }}
            />
            <input
              type="number"
              min={minAge}
              max="80"
              aria-label={ar ? "أعلى عمر" : "Maximum age"}
              value={maxAge}
              onChange={(event) => {
                setMaxAge(
                  Math.min(80, Math.max(Number(event.target.value), minAge)),
                )
                setPage(1)
              }}
            />
          </div>
        </label>
        <label>
          {ar ? "المحافظة أو المدينة" : "Governorate or city"}
          <input
            value={city}
            onChange={(event) => {
              setCity(event.target.value)
              setPage(1)
            }}
            placeholder={ar ? "مثال: القاهرة" : "e.g. Cairo"}
          />
        </label>
        <label>
          {ar ? "المؤهل الدراسي" : "Education level"}
          <select
            value={education}
            onChange={(event) => {
              setEducation(event.target.value)
              setPage(1)
            }}
          >
            <option value="">{ar ? "الكل" : "All"}</option>
            {educationOptions.map((option) => (
              <option value={option.value} key={option.value}>
                {ar ? option.ar : option.en}
              </option>
            ))}
          </select>
        </label>
        <label>
          {ar ? "الحالة الاجتماعية" : "Marital status"}
          <select
            value={marital}
            onChange={(event) => {
              setMarital(event.target.value)
              setPage(1)
            }}
          >
            <option value="">{ar ? "الكل" : "All"}</option>
            {maritalOptions.map((option) => (
              <option value={option.value} key={option.value}>
                {ar ? option.ar : option.en}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-check">
          <input
            type="checkbox"
            checked={savedOnly}
            onChange={(event) => setSavedOnly(event.target.checked)}
          />{" "}
          {ar ? "الملفات المحفوظة فقط" : "Saved profiles only"}
        </label>
        <Button kind="soft">
          {resultCount} {ar ? "نتيجة" : "results"}
        </Button>
      </aside>
      <section className="results">
        <div className="search-top">
          <div>
            <h2>
              {savedOnly
                ? ar
                  ? "الملفات المحفوظة"
                  : "Saved profiles"
                : search
                  ? ar
                    ? "نتائج البحث"
                    : "Search results"
                  : ar
                    ? "مختارون لك"
                    : "Selected for you"}
            </h2>
            <p>
              {loading && !savedOnly
                ? ar
                  ? "جارٍ البحث…"
                  : "Searching…"
                : ar
                  ? `${resultCount} ملفًا مطابقًا لمعاييرك`
                  : `${resultCount} profiles match your criteria`}
            </p>
          </div>
          {!savedOnly && (
            <div className="segmented">
              <button
                className={sort === "best" ? "active" : ""}
                onClick={() => setSort("best")}
              >
                {ar ? "الأكثر توافقًا" : "Best match"}
              </button>
              <button
                className={sort === "newest" ? "active" : ""}
                onClick={() => setSort("newest")}
              >
                {ar ? "الأحدث نشاطًا" : "Recently active"}
              </button>
            </div>
          )}
        </div>
        {error && (
          <p className="inline-feedback" role="alert">
            {error}
          </p>
        )}
        {loading && !savedOnly && results.length === 0 ? (
          <LoadingCard language={language} />
        ) : (
          <div className="profile-grid dashboard-cards">
            {savedOnly
              ? favorites.map((entry) => (
                  <div className="saved-card" key={entry.id}>
                    <ProfileCard profile={entry.user} language={language} />
                    <Button
                      kind="outline"
                      disabled={favoriteBusy === entry.user.id}
                      onClick={() => void removeFavorite(entry.user.id)}
                    >
                      {favoriteBusy === entry.user.id
                        ? ar
                          ? "جارٍ الإزالة…"
                          : "Removing…"
                        : ar
                          ? "إزالة من المحفوظات"
                          : "Remove from saved"}
                    </Button>
                  </div>
                ))
              : sorted.map((profile) => (
                  <ProfileCard
                    key={profile.id}
                    profile={profile}
                    language={language}
                  />
                ))}
          </div>
        )}
        {!loading && resultCount === 0 && (
          <div className="empty-state">
            {savedOnly
              ? ar
                ? "لم تحفظي أي ملفات بعد. اضغطي على القلب في أي ملف لحفظه."
                : "You have not saved any profiles yet. Tap the heart on a profile to save it."
              : ar
                ? "لا توجد ملفات تطابق هذه المعايير. جرّبي توسيع نطاق العمر أو المدينة."
                : "No profiles match these filters. Try widening the age or city range."}
          </div>
        )}
        {!savedOnly && pages > 1 && (
          <div className="pagination">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              {ar ? "السابق" : "Previous"}
            </button>
            <span>
              {ar
                ? `صفحة ${page} من ${pages}`
                : `Page ${page} of ${pages}`}
            </span>
            <button
              type="button"
              disabled={page >= pages || loading}
              onClick={() =>
                setPage((current) => Math.min(pages, current + 1))
              }
            >
              {ar ? "التالي" : "Next"}
            </button>
          </div>
        )}
      </section>
    </div>
  )
}

function Interests({ language }: { language: Language }) {
  const ar = language === "ar"
  type InterestRow = {
    id: string
    action: string
    createdAt: string
    user: ApiCard
  }
  const [tab, setTab] = useState<"received" | "sent">("received")
  const [received, setReceived] = useState<InterestRow[]>([])
  const [sent, setSent] = useState<InterestRow[]>([])
  const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [receivedData, sentData, matchData] = await Promise.all([
        discoveryApi.interests("received"),
        discoveryApi.interests("sent"),
        discoveryApi.matches(),
      ])
      const matched = new Set(matchData.results.map((entry) => entry.user.id))
      setMatchedIds(matched)
      setReceived(
        receivedData.results.filter((entry) => !matched.has(entry.user.id)),
      )
      setSent(sentData.results)
      setError("")
    } catch (reason) {
      setError(
        errorText(
          reason,
          ar ? "تعذّر تحميل الاهتمامات." : "Could not load interests.",
        ),
      )
    } finally {
      setLoading(false)
    }
  }, [ar])

  useEffect(() => {
    void load()
  }, [load])

  const respond = async (item: InterestRow, action: "accept" | "decline") => {
    setBusy(item.id)
    setError("")
    setNotice("")
    try {
      const result = await discoveryApi.respondInterest(item.id, action)
      setReceived((current) => current.filter((entry) => entry.id !== item.id))
      if (result.accepted) {
        setMatchedIds((current) => new Set(current).add(item.user.id))
        setNotice(
          ar
            ? `تم قبول اهتمام ${item.user.name} — يمكنكما الآن بدء محادثة.`
            : `You accepted ${item.user.name}'s interest — you can start chatting now.`,
        )
      } else {
        setNotice(
          ar
            ? `تم رفض اهتمام ${item.user.name}.`
            : `You declined ${item.user.name}'s interest.`,
        )
      }
    } catch (reason) {
      setError(
        errorText(
          reason,
          ar ? "تعذّر تنفيذ الإجراء." : "Could not complete the action.",
        ),
      )
    } finally {
      setBusy(null)
    }
  }

  const active = tab === "received" ? received : sent
  return (
    <div className="feature-page">
      <div className="tabs">
        <button
          className={tab === "received" ? "active" : ""}
          onClick={() => setTab("received")}
        >
          {ar ? "المستلمة" : "Received"}
          <span>{received.length}</span>
        </button>
        <button
          className={tab === "sent" ? "active" : ""}
          onClick={() => setTab("sent")}
        >
          {ar ? "المرسلة" : "Sent"}
          <span>{sent.length}</span>
        </button>
      </div>
      {error && (
        <p className="inline-feedback" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="inline-feedback" role="status">
          {notice}
        </p>
      )}
      {loading ? (
        <LoadingCard language={language} />
      ) : (
        <div className="interest-list">
          {active.map((item) => {
            const isMatched = matchedIds.has(item.user.id)
            const details = [
              item.user.education,
              item.user.maritalStatus,
              item.user.heightCm ? `${item.user.heightCm} cm` : "",
            ]
              .filter(Boolean)
              .join(" · ")
            return (
              <article key={item.id}>
                {item.user.photo ? (
                  <SafeImage
                    src={item.user.photo}
                    alt={
                      ar
                        ? `صورة ${item.user.name}`
                        : `${item.user.name}'s photo`
                    }
                    fallback={
                      <span className="interest-avatar">
                        <Icon name="user" size={26} />
                      </span>
                    }
                  />
                ) : (
                  <span className="interest-avatar">
                    <Icon name="user" size={26} />
                  </span>
                )}
                <div className="interest-info">
                  <div>
                    <h3>
                      {item.user.name}
                      {item.user.verified && (
                        <span>
                          <Icon name="check" size={12} />
                        </span>
                      )}
                      {tab === "sent" && isMatched && (
                        <em className="match-badge">
                          {ar ? "تطابق" : "Matched"}
                        </em>
                      )}
                    </h3>
                    <p>
                      {[
                        item.user.profession,
                        item.user.city,
                        item.user.age
                          ? ar
                            ? `${item.user.age} سنة`
                            : `${item.user.age} yrs`
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" • ") || (ar ? "بيانات غير مكتملة" : "Incomplete profile")}
                    </p>
                    <small>
                      <Icon name="clock" size={14} />{" "}
                      {formatDateTime(item.createdAt, language)}
                    </small>
                    {expanded === item.id && (
                      <div className="interest-details">
                        <p>
                          {item.user.bio ||
                            (ar
                              ? "لم يضف هذا المستخدم نبذة بعد."
                              : "This user has not added a bio yet.")}
                        </p>
                        {details && <small>{details}</small>}
                        {item.user.interests.length > 0 && (
                          <div className="tags">
                            {item.user.interests.slice(0, 6).map((tag) => (
                              <span key={tag}>{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="tags">
                    {item.user.interests.slice(0, 3).map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                </div>
                <div className="interest-actions">
                  <Button
                    kind="soft"
                    onClick={() =>
                      setExpanded(expanded === item.id ? null : item.id)
                    }
                  >
                    {expanded === item.id
                      ? ar
                        ? "إخفاء"
                        : "Hide"
                      : ar
                        ? "عرض الملف"
                        : "View profile"}
                  </Button>
                  {tab === "received" ? (
                    <>
                      <Button
                        kind="outline"
                        disabled={busy === item.id}
                        onClick={() => void respond(item, "decline")}
                      >
                        {ar ? "رفض" : "Decline"}
                      </Button>
                      <Button
                        disabled={busy === item.id}
                        onClick={() => void respond(item, "accept")}
                      >
                        {busy === item.id
                          ? ar
                            ? "جارٍ التنفيذ…"
                            : "Working…"
                          : ar
                            ? "قبول الاهتمام"
                            : "Accept interest"}
                      </Button>
                    </>
                  ) : (
                    <span className="interest-status">
                      {isMatched
                        ? ar
                          ? "تم التطابق — المحادثة متاحة"
                          : "Matched — chat available"
                        : ar
                          ? "بانتظار رد الطرف الآخر"
                          : "Awaiting their reply"}
                    </span>
                  )}
                </div>
              </article>
            )
          })}
          {active.length === 0 && (
            <div className="empty-state">
              {tab === "received"
                ? ar
                  ? "لا توجد اهتمامات مستلمة جديدة. ستظهر هنا عند إبداء أحدهم اهتمامًا بملفك."
                  : "No new interests received. They will appear here when someone shows interest in your profile."
                : ar
                  ? "لم ترسلي أي اهتمام بعد. يمكنك إرسال اهتمام من نتائج البحث."
                  : "You have not sent any interests yet. You can send one from the search results."}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Messages({ language }: { language: Language }) {
  const ar = language === "ar"
  type RequestRow = {
    id: string
    conversationId: string
    status: string
    createdAt: string
    user: { id: string; name: string; photo: string | null }
  }
  const [conversations, setConversations] = useState<ApiConversation[]>([])
  const [requests, setRequests] = useState<RequestRow[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [thread, setThread] = useState<ApiMessage[]>([])
  const [threadUser, setThreadUser] = useState<{
    id: string
    name: string
    photo: string | null
    verified: boolean
  } | null>(null)
  const [query, setQuery] = useState("")
  const [draft, setDraft] = useState("")
  const [loading, setLoading] = useState(true)
  const [threadLoading, setThreadLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [busyRequest, setBusyRequest] = useState<string | null>(null)
  const [showRequests, setShowRequests] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [conversationData, requestData] = await Promise.all([
        messagingApi.conversations(),
        messagingApi.requests(),
      ])
      setConversations(conversationData.results)
      setRequests(requestData.results)
      setSelectedId((current) => {
        if (
          current &&
          conversationData.results.some((entry) => entry.id === current)
        ) {
          return current
        }
        return conversationData.results[0]?.id ?? null
      })
      setError("")
    } catch (reason) {
      setError(
        errorText(
          reason,
          ar ? "تعذّر تحميل المحادثات." : "Could not load conversations.",
        ),
      )
    } finally {
      setLoading(false)
    }
  }, [ar])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    setBlocked(false)
    setNotice("")
    if (!selectedId) {
      setThread([])
      setThreadUser(null)
      return
    }
    let cancelled = false
    setThreadLoading(true)
    void (async () => {
      try {
        const data = await messagingApi.conversation(selectedId, { limit: 50 })
        if (cancelled) return
        setThread(data.results)
        setThreadUser(data.conversation.user)
        await messagingApi.markRead(selectedId).catch(() => undefined)
        setConversations((current) =>
          current.map((entry) =>
            entry.id === selectedId ? { ...entry, unread: 0 } : entry,
          ),
        )
        setError("")
      } catch (reason) {
        if (!cancelled)
          setError(
            errorText(
              reason,
              ar
                ? "تعذّر تحميل الرسائل."
                : "Could not load the conversation.",
            ),
          )
      } finally {
        if (!cancelled) setThreadLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [selectedId, ar])

  const sendMessage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const text = draft.trim()
    if (!text || !selectedId) return
    setSending(true)
    setError("")
    try {
      const result = await messagingApi.send(selectedId, text)
      setThread((current) => [...current, result.message])
      setDraft("")
      setConversations((current) =>
        current.map((entry) =>
          entry.id === selectedId
            ? {
                ...entry,
                lastMessageAt: result.message.createdAt,
                lastMessage: {
                  id: result.message.id,
                  body: result.message.body,
                  type: result.message.type,
                  senderId: "",
                  createdAt: result.message.createdAt,
                  mine: true,
                },
              }
            : entry,
        ),
      )
    } catch (reason) {
      setError(
        errorText(
          reason,
          ar ? "تعذّر إرسال الرسالة." : "Could not send the message.",
        ),
      )
    } finally {
      setSending(false)
    }
  }

  const archiveConversation = async () => {
    if (!selectedId) return
    try {
      await messagingApi.archive(selectedId)
      const remaining = conversations.filter(
        (entry) => entry.id !== selectedId,
      )
      setConversations(remaining)
      setSelectedId(remaining[0]?.id ?? null)
      setNotice(
        ar
          ? "تمت أرشفة المحادثة وإزالتها من القائمة."
          : "The conversation was archived and removed from the list.",
      )
    } catch (reason) {
      setError(
        errorText(
          reason,
          ar ? "تعذّرت أرشفة المحادثة." : "Could not archive the conversation.",
        ),
      )
    }
  }

  const startCall = async (type: "voice" | "video") => {
    if (!threadUser) return
    const active = conversations.find((entry) => entry.id === selectedId)
    if (!active?.matchId) {
      setNotice(
        ar
          ? "المكالمات متاحة بعد قبول الاهتمام المتبادل."
          : "Calls are available after a mutual interest is accepted.",
      )
      return
    }
    try {
      const result = await callsApi.start(threadUser.id, type)
      setNotice(
        ar
          ? `بدأت المكالمة بسعر ${result.call.ratePerMinute} رصيد/دقيقة.`
          : `Call started at ${result.call.ratePerMinute} credits/minute.`,
      )
    } catch (reason) {
      setError(
        errorText(
          reason,
          ar ? "تعذّر بدء المكالمة." : "Could not start the call.",
        ),
      )
    }
  }

  const blockUser = async () => {
    if (!threadUser) return
    try {
      await discoveryApi.block(threadUser.id, "blocked_from_messages")
      setBlocked(true)
      setNotice(
        ar
          ? "تم حظر المستخدم. لن يتمكن من مراسلتك."
          : "The user was blocked and can no longer message you.",
      )
    } catch (reason) {
      setError(
        errorText(reason, ar ? "تعذّر حظر المستخدم." : "Could not block the user."),
      )
    }
  }

  const unblockUser = async () => {
    if (!threadUser) return
    try {
      await discoveryApi.unblock(threadUser.id)
      setBlocked(false)
      setNotice(ar ? "تم إلغاء الحظر." : "The block was removed.")
    } catch (reason) {
      setError(
        errorText(
          reason,
          ar ? "تعذّر إلغاء الحظر." : "Could not remove the block.",
        ),
      )
    }
  }

  const respondRequest = async (
    request: RequestRow,
    action: "accept" | "ignore",
  ) => {
    setBusyRequest(request.id)
    setError("")
    try {
      await messagingApi.respondRequest(request.id, action)
      setRequests((current) =>
        current.filter((entry) => entry.id !== request.id),
      )
      if (action === "accept") {
        await load()
        setSelectedId(request.conversationId)
        setShowRequests(false)
        setNotice(
          ar
            ? "تم قبول طلب المحادثة — يمكنك الآن الرد."
            : "Message request accepted — you can reply now.",
        )
      } else {
        setNotice(
          ar ? "تم تجاهل طلب المحادثة." : "The message request was ignored.",
        )
      }
    } catch (reason) {
      setError(
        errorText(
          reason,
          ar
            ? "تعذّر الرد على طلب المحادثة."
            : "Could not respond to the message request.",
        ),
      )
    } finally {
      setBusyRequest(null)
    }
  }

  const visibleConversations = conversations.filter((entry) => {
    if (!query.trim()) return true
    const needle = query.trim()
    return (
      (entry.user?.name ?? "").includes(needle) ||
      (entry.lastMessage?.body ?? "").includes(needle)
    )
  })
  const activeConversation =
    conversations.find((entry) => entry.id === selectedId) ?? null
  const headerUser = threadUser ?? activeConversation?.user ?? null

  return (
    <div className="messages-box">
      <aside className="conversations">
        <div className="conversation-search">
          <Icon name="search" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={ar ? "ابحث في المحادثات" : "Search conversations"}
          />
        </div>
        {requests.length > 0 && (
          <button
            className={`requests-banner ${showRequests ? "active" : ""}`}
            onClick={() => setShowRequests(!showRequests)}
          >
            <Icon name="bell" size={16} />
            <span>
              {ar
                ? `طلبات محادثة (${requests.length})`
                : `Message requests (${requests.length})`}
            </span>
          </button>
        )}
        {loading ? (
          <p className="inline-feedback" role="status">
            {ar ? "جارٍ التحميل…" : "Loading…"}
          </p>
        ) : (
          visibleConversations.map((entry) => (
            <button
              className={
                !showRequests && selectedId === entry.id ? "active" : ""
              }
              onClick={() => {
                setSelectedId(entry.id)
                setShowRequests(false)
              }}
              key={entry.id}
            >
              {entry.user?.photo ? (
                <SafeImage
                  src={entry.user.photo}
                  alt=""
                  fallback={
                    <span className="avatar-fallback">
                      <Icon name="user" size={20} />
                    </span>
                  }
                />
              ) : (
                <span className="avatar-fallback">
                  <Icon name="user" size={20} />
                </span>
              )}
              <div>
                <b>{entry.user?.name ?? (ar ? "مستخدم" : "User")}</b>
                <p>
                  {entry.lastMessage
                    ? `${
                        entry.lastMessage.mine ? (ar ? "أنت: " : "You: ") : ""
                      }${entry.lastMessage.body}`
                    : ar
                      ? "لا توجد رسائل بعد"
                      : "No messages yet"}
                </p>
              </div>
              <span>
                <small>
                  {entry.lastMessageAt
                    ? formatDateTime(entry.lastMessageAt, language)
                    : ""}
                </small>
                {entry.unread > 0 && <i>{entry.unread}</i>}
              </span>
            </button>
          ))
        )}
        {!loading && visibleConversations.length === 0 && (
          <div className="empty-state">
            {ar
              ? "لا توجد محادثات بعد. تُفتح المحادثة بعد قبول اهتمام متبادل."
              : "No conversations yet. Chat opens after a mutual interest is accepted."}
          </div>
        )}
      </aside>
      <section className="chat">
        {showRequests ? (
          <div className="requests-panel">
            <header>
              <div>
                <b>{ar ? "طلبات المحادثة" : "Message requests"}</b>
                <small>
                  {ar
                    ? "راجعي الطلبات قبل فتح المحادثة."
                    : "Review requests before opening the chat."}
                </small>
              </div>
            </header>
            <div className="request-list">
              {requests.map((request) => (
                <article key={request.id}>
                  {request.user.photo ? (
                    <SafeImage
                      src={request.user.photo}
                      alt=""
                      fallback={
                        <span className="avatar-fallback">
                          <Icon name="user" size={20} />
                        </span>
                      }
                    />
                  ) : (
                    <span className="avatar-fallback">
                      <Icon name="user" size={20} />
                    </span>
                  )}
                  <div>
                    <b>{request.user.name}</b>
                    <small>{formatDateTime(request.createdAt, language)}</small>
                  </div>
                  <div className="request-actions">
                    <Button
                      kind="outline"
                      disabled={busyRequest === request.id}
                      onClick={() => void respondRequest(request, "ignore")}
                    >
                      {ar ? "تجاهل" : "Ignore"}
                    </Button>
                    <Button
                      disabled={busyRequest === request.id}
                      onClick={() => void respondRequest(request, "accept")}
                    >
                      {ar ? "قبول" : "Accept"}
                    </Button>
                  </div>
                </article>
              ))}
              {requests.length === 0 && (
                <div className="empty-state">
                  {ar ? "لا توجد طلبات معلّقة." : "No pending requests."}
                </div>
              )}
            </div>
          </div>
        ) : activeConversation ? (
          <>
            <header>
              {headerUser?.photo ? (
                <SafeImage
                  src={headerUser.photo}
                  alt=""
                  fallback={
                    <span className="avatar-fallback">
                      <Icon name="user" size={20} />
                    </span>
                  }
                />
              ) : (
                <span className="avatar-fallback">
                  <Icon name="user" size={20} />
                </span>
              )}
              <div>
                <b>{headerUser?.name ?? (ar ? "مستخدم" : "User")}</b>
                <small>
                  <i />{" "}
                  {activeConversation.matchId
                    ? ar
                      ? "تطابق متبادل · المحادثة آمنة"
                      : "Mutual match · secure chat"
                    : ar
                      ? "محادثة"
                      : "Conversation"}
                </small>
              </div>
              <div className="chat-tools">
                {requests.length > 0 && (
                  <button
                    aria-label={ar ? "طلبات المحادثة" : "Message requests"}
                    onClick={() => setShowRequests(true)}
                  >
                    <Icon name="bell" />
                  </button>
                )}
                <button
                  aria-label={ar ? "مكالمة صوتية" : "Voice call"}
                  onClick={() => void startCall("voice")}
                >
                  <Icon name="phone" />
                </button>
                <button
                  aria-label={ar ? "مكالمة فيديو" : "Video call"}
                  onClick={() => void startCall("video")}
                >
                  <Icon name="video" />
                </button>
                <button
                  aria-label={ar ? "أرشفة المحادثة" : "Archive conversation"}
                  onClick={() => void archiveConversation()}
                >
                  <Icon name="book" />
                </button>
                <button
                  aria-label={ar ? "حظر المستخدم" : "Block user"}
                  onClick={() => void blockUser()}
                >
                  <Icon name="lock" />
                </button>
              </div>
            </header>
            <div className="chat-safety">
              <Icon name="shield" size={16} />{" "}
              {ar
                ? "حافظي على التواصل داخل المنصة ولا تشاركي بياناتك الشخصية مبكرًا."
                : "Keep conversations on the platform and do not share personal information too early."}
            </div>
            {error && (
              <div className="inline-feedback" role="alert">
                {error}
              </div>
            )}
            {notice && (
              <div className="inline-feedback" role="status">
                {notice}
              </div>
            )}
            {blocked ? (
              <div className="empty-state">
                {ar
                  ? "تم حظر هذا المستخدم. لن تصلك رسائل جديدة منه."
                  : "This user is blocked. You will not receive new messages from them."}
                <Button kind="soft" onClick={() => void unblockUser()}>
                  {ar ? "إلغاء الحظر" : "Unblock"}
                </Button>
              </div>
            ) : (
              <>
                <div className="messages">
                  {threadLoading && (
                    <span className="day">
                      {ar ? "جارٍ تحميل الرسائل…" : "Loading messages…"}
                    </span>
                  )}
                  {!threadLoading && thread.length === 0 && (
                    <div className="empty-state">
                      {ar
                        ? "لا توجد رسائل بعد. ابدئي بتحية محترمة."
                        : "No messages yet. Start with a respectful greeting."}
                    </div>
                  )}
                  {thread.map((message) => (
                    <div
                      className={`bubble ${message.mine ? "me" : "them"}`}
                      key={message.id}
                    >
                      {message.type === "voice"
                        ? ar
                          ? "[رسالة صوتية]"
                          : "[Voice message]"
                        : message.body}
                      <small>{formatDateTime(message.createdAt, language)}</small>
                    </div>
                  ))}
                </div>
                <form className="composer" onSubmit={sendMessage}>
                  <input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder={
                      ar
                        ? "اكتبي رسالة محترمة..."
                        : "Write a respectful message..."
                    }
                    maxLength={2000}
                  />
                  <button
                    className="send"
                    type="submit"
                    disabled={sending || !draft.trim()}
                    aria-label={ar ? "إرسال الرسالة" : "Send message"}
                  >
                    <Icon name="send" size={17} />
                  </button>
                </form>
              </>
            )}
          </>
        ) : (
          <div className="empty-state">
            {ar
              ? "اختاري محادثة من القائمة أو راجعي طلبات المحادثة."
              : "Choose a conversation from the list or review message requests."}
            {requests.length > 0 && (
              <Button kind="soft" onClick={() => setShowRequests(true)}>
                {ar
                  ? `مراجعة طلبات المحادثة (${requests.length})`
                  : `Review message requests (${requests.length})`}
              </Button>
            )}
          </div>
        )}
        {!showRequests && !activeConversation && error && (
          <p className="inline-feedback" role="alert">
            {error}
          </p>
        )}
      </section>
    </div>
  )
}

function Notifications({ language }: { language: Language }) {
  const ar = language === "ar"
  const [items, setItems] = useState<ApiNotification[]>([])
  const [unread, setUnread] = useState(0)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await notificationsApi.list({
        unread: unreadOnly || undefined,
        limit: 50,
      })
      setItems(data.results)
      setUnread(data.unread)
      setError("")
    } catch (reason) {
      setError(
        errorText(
          reason,
          ar ? "تعذّر تحميل الإشعارات." : "Could not load notifications.",
        ),
      )
    } finally {
      setLoading(false)
    }
  }, [ar, unreadOnly])

  useEffect(() => {
    void load()
  }, [load])

  const markRead = async (item: ApiNotification) => {
    if (item.isRead) return
    try {
      await notificationsApi.read(item.id)
      setItems((current) =>
        current.map((entry) =>
          entry.id === item.id ? { ...entry, isRead: true } : entry,
        ),
      )
      setUnread((current) => Math.max(0, current - 1))
    } catch (reason) {
      setError(
        errorText(
          reason,
          ar ? "تعذّر تحديث الإشعار." : "Could not update the notification.",
        ),
      )
    }
  }

  const markAll = async () => {
    try {
      await notificationsApi.readAll()
      setItems((current) =>
        current.map((entry) => ({ ...entry, isRead: true })),
      )
      setUnread(0)
      setNotice(
        ar ? "تم تحديد كل الإشعارات كمقروءة." : "All notifications marked as read.",
      )
    } catch (reason) {
      setError(
        errorText(
          reason,
          ar ? "تعذّر تحديث الإشعارات." : "Could not update notifications.",
        ),
      )
    }
  }

  const remove = async (item: ApiNotification) => {
    setBusy(item.id)
    setError("")
    try {
      await notificationsApi.remove(item.id)
      setItems((current) => current.filter((entry) => entry.id !== item.id))
      if (!item.isRead) setUnread((current) => Math.max(0, current - 1))
    } catch (reason) {
      setError(
        errorText(
          reason,
          ar ? "تعذّر حذف الإشعار." : "Could not delete the notification.",
        ),
      )
    } finally {
      setBusy(null)
    }
  }

  const iconFor = (type: string): IconName => {
    if (type.includes("match") || type.includes("accept")) return "check"
    if (type.includes("interest") || type.includes("like")) return "heart"
    if (type.includes("message")) return "chat"
    if (type.includes("call")) return "phone"
    if (type.includes("verification")) return "shield"
    if (type.includes("security")) return "lock"
    if (type.includes("community")) return "users"
    if (type.includes("wallet") || type.includes("payment")) return "wallet"
    return "bell"
  }

  return (
    <div className="notification-page">
      <div className="block-heading">
        <div>
          <h2>{ar ? "كل الإشعارات" : "All notifications"}</h2>
          <p>
            {ar
              ? `لديك ${unread} إشعارًا غير مقروء.`
              : `You have ${unread} unread notification${unread === 1 ? "" : "s"}.`}
          </p>
        </div>
        <div className="notification-actions">
          <button
            className={unreadOnly ? "active" : ""}
            onClick={() => setUnreadOnly(!unreadOnly)}
          >
            {unreadOnly
              ? ar
                ? "عرض الكل"
                : "Show all"
              : ar
                ? "غير المقروء فقط"
                : "Unread only"}
          </button>
          {unread > 0 && (
            <button onClick={() => void markAll()}>
              {ar ? "تحديد الكل كمقروء" : "Mark all as read"}
            </button>
          )}
        </div>
      </div>
      {error && (
        <p className="inline-feedback" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="inline-feedback" role="status">
          {notice}
        </p>
      )}
      {loading ? (
        <p className="inline-feedback" role="status">
          {ar ? "جارٍ التحميل…" : "Loading…"}
        </p>
      ) : (
        items.map((item) => (
          <article
            className={item.isRead ? "" : "unread"}
            key={item.id}
            onClick={() => void markRead(item)}
          >
            <span>
              <Icon name={iconFor(item.type)} />
            </span>
            <div>
              <b>{item.title}</b>
              <p>{item.body}</p>
              <small>{formatDateTime(item.createdAt, language)}</small>
            </div>
            {!item.isRead && <i />}
            <button
              className="notification-delete"
              aria-label={ar ? "حذف الإشعار" : "Delete notification"}
              disabled={busy === item.id}
              onClick={(event) => {
                event.stopPropagation()
                void remove(item)
              }}
            >
              ×
            </button>
          </article>
        ))
      )}
      {!loading && items.length === 0 && (
        <div className="empty-state">
          {unreadOnly
            ? ar
              ? "لا توجد إشعارات غير مقروءة."
              : "There are no unread notifications."
            : ar
              ? "لا توجد إشعارات بعد."
              : "There are no notifications yet."}
        </div>
      )}
    </div>
  )
}

function Settings({
  profile,
  language,
}: {
  profile: boolean
  language: Language
}) {
  const ar = language === "ar"
  type FormState = {
    firstName: string
    lastName: string
    birth: string
    city: string
    country: string
    education: string
    maritalStatus: string
    profession: string
    income: string
    height: string
    languages: string
    bio: string
    smoking: string
    interests: string
    personality: string
    lifestyle: string
    marriageIntent: string
    marriageTimeline: string
    wantsChildren: string
    relocation: string
    livingPreference: string
    religion: string
    ageMin: string
    ageMax: string
    countries: string
    heightMin: string
    heightMax: string
  }
  type PrivacyState = {
    profileVisibility: string
    showOnlineStatus: boolean
    hideLastSeen: boolean
    cityOnlyLocation: boolean
    searchable: boolean
    privatePhotosNeedApproval: boolean
    profilePhotosNeedApproval: boolean
    watermarkPhotos: boolean
  }
  type NotificationState = {
    match: boolean
    messages: boolean
    calls: boolean
    community: boolean
    emailWeekly: boolean
    newLoginAlerts: boolean
    twoFactorEnabled: boolean
  }
  type PrivacyToggleKey = Exclude<keyof PrivacyState, "profileVisibility">
  type NotificationToggleKey = keyof NotificationState

  const emptyForm: FormState = {
    firstName: "",
    lastName: "",
    birth: "",
    city: "",
    country: "EG",
    education: "",
    maritalStatus: "",
    profession: "",
    income: "",
    height: "",
    languages: "",
    bio: "",
    smoking: "",
    interests: "",
    personality: "",
    lifestyle: "",
    marriageIntent: "",
    marriageTimeline: "",
    wantsChildren: "",
    relocation: "",
    livingPreference: "",
    religion: "",
    ageMin: "",
    ageMax: "",
    countries: "",
    heightMin: "",
    heightMax: "",
  }
  const defaultPrivacy: PrivacyState = {
    profileVisibility: "public",
    showOnlineStatus: true,
    hideLastSeen: false,
    cityOnlyLocation: true,
    searchable: true,
    privatePhotosNeedApproval: true,
    profilePhotosNeedApproval: false,
    watermarkPhotos: false,
  }
  const defaultNotifications: NotificationState = {
    match: true,
    messages: true,
    calls: true,
    community: true,
    emailWeekly: false,
    newLoginAlerts: true,
    twoFactorEnabled: false,
  }
  const sectionDefs = profile
    ? [
        { key: "basics", ar: "المعلومات الأساسية", en: "Basic information" },
        { key: "lifestyle", ar: "نمط الحياة", en: "Lifestyle" },
        { key: "marriage", ar: "تفضيلات الزواج", en: "Marriage preferences" },
        { key: "dealBreakers", ar: "نقاط الرفض القاطع", en: "Deal breakers" },
      ]
    : [
        { key: "privacy", ar: "الخصوصية والظهور", en: "Privacy & visibility" },
        { key: "security", ar: "أمان الحساب", en: "Account security" },
        { key: "notifications", ar: "الإشعارات", en: "Notifications" },
      ]
  const countryChoices = [
    { code: "EG", ar: "مصر", en: "Egypt" },
    { code: "SA", ar: "السعودية", en: "Saudi Arabia" },
    { code: "AE", ar: "الإمارات", en: "United Arab Emirates" },
    { code: "QA", ar: "قطر", en: "Qatar" },
    { code: "KW", ar: "الكويت", en: "Kuwait" },
    { code: "JO", ar: "الأردن", en: "Jordan" },
    { code: "MA", ar: "المغرب", en: "Morocco" },
    { code: "TN", ar: "تونس", en: "Tunisia" },
    { code: "DZ", ar: "الجزائر", en: "Algeria" },
  ]
  const educationChoices = [
    { value: "bachelor", ar: "جامعي", en: "University" },
    { value: "master", ar: "دراسات عليا", en: "Postgraduate" },
    { value: "phd", ar: "دكتوراه", en: "Doctorate" },
    { value: "high_school", ar: "ثانوي", en: "Secondary" },
    { value: "other", ar: "أخرى", en: "Other" },
  ]
  const [section, setSection] = useState(profile ? "basics" : "privacy")
  const [data, setData] = useState<ApiFullProfile | null>(null)
  const [catalog, setCatalog] = useState<Awaited<
    ReturnType<typeof profileApi.catalog>
  > | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [privacy, setPrivacy] = useState<PrivacyState>(defaultPrivacy)
  const [notificationPrefs, setNotificationPrefs] =
    useState<NotificationState>(defaultNotifications)
  const [dealBreakers, setDealBreakers] = useState<string[]>([])
  const [avatar, setAvatar] = useState("")
  const [photoBusy, setPhotoBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [savedMessage, setSavedMessage] = useState("")
  const [exporting, setExporting] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    current: "",
    next: "",
    confirm: "",
  })
  const [passwordBusy, setPasswordBusy] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState("")
  const [phoneForm, setPhoneForm] = useState({ phone: "", code: "" })
  const [phoneCodeSent, setPhoneCodeSent] = useState(false)
  const [phoneBusy, setPhoneBusy] = useState(false)
  const [phoneDevCode, setPhoneDevCode] = useState("")
  const [showDelete, setShowDelete] = useState(false)
  const [deleteForm, setDeleteForm] = useState({
    password: "",
    confirmation: "",
  })
  const [deleteBusy, setDeleteBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [full, catalogData] = await Promise.all([
        profileApi.get(),
        profileApi.catalog(),
      ])
      setData(full)
      setCatalog(catalogData)
      setForm({
        firstName: full.user.firstName,
        lastName: full.user.lastName ?? "",
        birth: full.user.dateOfBirth
          ? full.user.dateOfBirth.slice(0, 10)
          : "",
        city: full.user.city ?? "",
        country: full.user.country ?? "EG",
        education: full.profile?.education ?? "",
        maritalStatus: full.profile?.maritalStatus ?? "",
        profession: full.profile?.profession ?? "",
        income: full.profile?.incomeRange ?? "",
        height: full.profile?.heightCm ? String(full.profile.heightCm) : "",
        languages: (full.profile?.languages ?? []).join(", "),
        bio: full.about?.bio ?? "",
        smoking: full.profile?.smoking ?? "",
        interests: (full.about?.interests ?? []).join(", "),
        personality: (full.about?.personality ?? []).join(", "),
        lifestyle: (full.about?.lifestyle ?? []).join(", "),
        marriageIntent: full.marriage?.marriageIntent ?? "",
        marriageTimeline: full.marriage?.marriageTimeline ?? "",
        wantsChildren: full.marriage?.wantsChildren ?? "",
        relocation: full.marriage?.relocation ?? "",
        livingPreference: full.marriage?.livingPreference ?? "",
        religion: full.marriage?.religion ?? "",
        ageMin: full.preferences?.ageMin
          ? String(full.preferences.ageMin)
          : "",
        ageMax: full.preferences?.ageMax
          ? String(full.preferences.ageMax)
          : "",
        countries: (full.preferences?.countries ?? []).join(", "),
        heightMin: full.preferences?.heightMin
          ? String(full.preferences.heightMin)
          : "",
        heightMax: full.preferences?.heightMax
          ? String(full.preferences.heightMax)
          : "",
      })
      setPrivacy({
        profileVisibility: full.privacy?.profileVisibility ?? "public",
        showOnlineStatus: full.privacy?.showOnlineStatus ?? true,
        hideLastSeen: full.privacy?.hideLastSeen ?? false,
        cityOnlyLocation: full.privacy?.cityOnlyLocation ?? true,
        searchable: full.privacy?.searchable ?? true,
        privatePhotosNeedApproval:
          full.privacy?.privatePhotosNeedApproval ?? true,
        profilePhotosNeedApproval:
          full.privacy?.profilePhotosNeedApproval ?? false,
        watermarkPhotos: full.privacy?.watermarkPhotos ?? false,
      })
      setNotificationPrefs({
        match: full.notifications?.match ?? true,
        messages: full.notifications?.messages ?? true,
        calls: full.notifications?.calls ?? true,
        community: full.notifications?.community ?? true,
        emailWeekly: full.notifications?.emailWeekly ?? false,
        newLoginAlerts: full.notifications?.newLoginAlerts ?? true,
        twoFactorEnabled: full.notifications?.twoFactorEnabled ?? false,
      })
      setDealBreakers(full.dealBreakers.map((item) => item.key))
      setAvatar(
        full.photos.find((photo) => photo.isPrimary)?.url ??
          full.photos[0]?.url ??
          "",
      )
      setError("")
    } catch (reason) {
      setError(
        errorText(
          reason,
          ar ? "تعذّر تحميل إعدادات الحساب." : "Could not load account settings.",
        ),
      )
    } finally {
      setLoading(false)
    }
  }, [ar])

  useEffect(() => {
    void load()
  }, [load])

  const setField = (key: keyof FormState, value: string) =>
    setForm((current) => ({ ...current, [key]: value }))
  const togglePrivacy = (key: PrivacyToggleKey) =>
    setPrivacy((current) => ({ ...current, [key]: !current[key] }))
  const toggleNotification = (key: NotificationToggleKey) =>
    setNotificationPrefs((current) => ({ ...current, [key]: !current[key] }))
  const toggleBreaker = (key: string) =>
    setDealBreakers((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key],
    )

  const saveBasics = async () => {
    if (form.firstName.trim().length < 2) {
      throw new Error(
        ar ? "الاسم الأول يجب أن يكون حرفين على الأقل." : "First name must be at least 2 characters.",
      )
    }
    const height = form.height.trim() ? Number(form.height) : null
    if (
      height !== null &&
      (!Number.isFinite(height) || height < 120 || height > 230)
    ) {
      throw new Error(
        ar ? "الطول يجب أن يكون بين 120 و230 سم." : "Height must be between 120 and 230 cm.",
      )
    }
    if (form.birth) {
      const dob = new Date(form.birth)
      if (Number.isNaN(dob.getTime())) {
        throw new Error(ar ? "تاريخ الميلاد غير صالح." : "Invalid date of birth.")
      }
    }
    await profileApi.basics({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim() || null,
      ...(form.birth ? { dateOfBirth: form.birth } : {}),
      ...(form.city.trim() ? { city: form.city.trim() } : {}),
      ...(form.country.trim().length === 2
        ? { country: form.country.trim().toUpperCase() }
        : {}),
    })
    await profileApi.details({
      education: form.education || null,
      maritalStatus: form.maritalStatus || null,
      profession: form.profession.trim() || null,
      incomeRange: form.income.trim() || null,
      heightCm: height,
      languages: splitList(form.languages),
    })
    await profileApi.about({ bio: form.bio.trim() || null })
  }

  const saveLifestyle = async () => {
    await profileApi.details({ smoking: form.smoking || null })
    await profileApi.about({
      interests: splitList(form.interests),
      personality: splitList(form.personality),
      lifestyle: splitList(form.lifestyle),
    })
    await profileApi.marriage({ wantsChildren: form.wantsChildren || null })
  }

  const saveMarriage = async () => {
    const ageMin = form.ageMin.trim() ? Number(form.ageMin) : null
    const ageMax = form.ageMax.trim() ? Number(form.ageMax) : null
    const heightMin = form.heightMin.trim() ? Number(form.heightMin) : null
    const heightMax = form.heightMax.trim() ? Number(form.heightMax) : null
    if (ageMin !== null && (!Number.isFinite(ageMin) || ageMin < 18 || ageMin > 80)) {
      throw new Error(ar ? "الحد الأدنى للعمر يجب أن يكون بين 18 و80." : "Minimum age must be between 18 and 80.")
    }
    if (ageMax !== null && (!Number.isFinite(ageMax) || ageMax < 18 || ageMax > 80)) {
      throw new Error(ar ? "الحد الأقصى للعمر يجب أن يكون بين 18 و80." : "Maximum age must be between 18 and 80.")
    }
    if (ageMin !== null && ageMax !== null && ageMin > ageMax) {
      throw new Error(ar ? "الحد الأدنى للعمر أكبر من الحد الأقصى." : "Minimum age is greater than maximum age.")
    }
    if (heightMin !== null && (heightMin < 120 || heightMin > 230)) {
      throw new Error(ar ? "الحد الأدنى للطول غير صالح." : "Minimum height is invalid.")
    }
    if (heightMax !== null && (heightMax < 120 || heightMax > 230)) {
      throw new Error(ar ? "الحد الأقصى للطول غير صالح." : "Maximum height is invalid.")
    }
    if (heightMin !== null && heightMax !== null && heightMin > heightMax) {
      throw new Error(ar ? "الحد الأدنى للطول أكبر من الحد الأقصى." : "Minimum height is greater than maximum height.")
    }
    await profileApi.marriage({
      marriageIntent: form.marriageIntent || null,
      marriageTimeline: form.marriageTimeline || null,
      wantsChildren: form.wantsChildren || null,
      relocation: form.relocation || null,
      livingPreference: form.livingPreference || null,
      religion: form.religion.trim() || null,
    })
    await profileApi.preferences({
      ageMin,
      ageMax,
      heightMin,
      heightMax,
      countries: splitList(form.countries),
    })
  }

  const saveCurrent = async () => {
    if (saving) return
    setSaving(true)
    setError("")
    setSavedMessage("")
    try {
      if (section === "basics") await saveBasics()
      else if (section === "lifestyle") await saveLifestyle()
      else if (section === "marriage") await saveMarriage()
      else if (section === "dealBreakers")
        await profileApi.setDealBreakers(dealBreakers)
      else if (section === "privacy")
        await profileApi.privacy({
          profileVisibility: privacy.profileVisibility,
          showOnlineStatus: privacy.showOnlineStatus,
          hideLastSeen: privacy.hideLastSeen,
          cityOnlyLocation: privacy.cityOnlyLocation,
          searchable: privacy.searchable,
          privatePhotosNeedApproval: privacy.privatePhotosNeedApproval,
          profilePhotosNeedApproval: privacy.profilePhotosNeedApproval,
          watermarkPhotos: privacy.watermarkPhotos,
        })
      else if (section === "security")
        await profileApi.notifications({
          twoFactorEnabled: twoFactorReady
            ? notificationPrefs.twoFactorEnabled
            : false,
          newLoginAlerts: notificationPrefs.newLoginAlerts,
        })
      else if (section === "notifications")
        await profileApi.notifications({
          match: notificationPrefs.match,
          messages: notificationPrefs.messages,
          calls: notificationPrefs.calls,
          community: notificationPrefs.community,
          emailWeekly: notificationPrefs.emailWeekly,
        })
      setSavedMessage(ar ? "تم حفظ التغييرات." : "Changes saved.")
      const refreshed = await profileApi.get()
      setData(refreshed)
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : ar
            ? "تعذّر حفظ التغييرات."
            : "Could not save changes.",
      )
    } finally {
      setSaving(false)
    }
  }

  const changePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setPasswordMessage("")
    if (passwordForm.next.length < 8) {
      setError(
        ar ? "كلمة المرور الجديدة 8 أحرف على الأقل." : "The new password must be at least 8 characters.",
      )
      return
    }
    if (passwordForm.next !== passwordForm.confirm) {
      setError(
        ar ? "تأكيد كلمة المرور غير مطابق." : "The password confirmation does not match.",
      )
      return
    }
    setPasswordBusy(true)
    try {
      if (data?.user.hasPassword) {
        await authApi.changePassword({
          currentPassword: passwordForm.current,
          newPassword: passwordForm.next,
        })
      } else {
        await authApi.setPassword({ newPassword: passwordForm.next })
      }
      setPasswordForm({ current: "", next: "", confirm: "" })
      setPasswordMessage(
        ar
          ? "تم تحديث كلمة المرور وإلغاء الجلسات الأخرى."
          : "Your password was updated and other sessions were revoked.",
      )
    } catch (reason) {
      setError(
        errorText(
          reason,
          ar ? "تعذّر تحديث كلمة المرور." : "Could not update the password.",
        ),
      )
    } finally {
      setPasswordBusy(false)
    }
  }

  const startPhoneChange = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setSavedMessage("")
    setPhoneDevCode("")
    if (!phoneForm.phone.trim()) {
      setError(
        ar
          ? "أدخل رقم الهاتف الجديد أولًا."
          : "Enter the new phone number first.",
      )
      return
    }
    setPhoneBusy(true)
    try {
      const result = await authApi.phoneChangeStart(phoneForm.phone.trim())
      setPhoneCodeSent(true)
      setPhoneDevCode(result.devCode ?? "")
      setSavedMessage(
        ar
          ? `أرسلنا كود تحقق إلى ${phoneForm.phone.trim()}.`
          : `We sent a verification code to ${phoneForm.phone.trim()}.`,
      )
    } catch (reason) {
      setError(
        errorText(
          reason,
          ar ? "تعذّر إرسال كود التحقق." : "Could not send the verification code.",
        ),
      )
    } finally {
      setPhoneBusy(false)
    }
  }

  const verifyPhoneChange = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()
    setError("")
    setSavedMessage("")
    if (!/^\d{5}$/.test(phoneForm.code)) {
      setError(ar ? "كود التحقق 5 أرقام." : "The verification code is 5 digits.")
      return
    }
    setPhoneBusy(true)
    try {
      const result = await authApi.phoneChangeVerify({
        phone: phoneForm.phone.trim(),
        code: phoneForm.code,
      })
      setData((current) =>
        current ? { ...current, user: result.user } : current,
      )
      setPhoneCodeSent(false)
      setPhoneDevCode("")
      setPhoneForm({ phone: "", code: "" })
      setSavedMessage(
        ar
          ? "تم توثيق رقم الهاتف الجديد وحفظه في حسابك."
          : "Your new phone number is verified and saved.",
      )
    } catch (reason) {
      setError(
        errorText(
          reason,
          ar ? "تعذّر توثيق رقم الهاتف." : "Could not verify the phone number.",
        ),
      )
    } finally {
      setPhoneBusy(false)
    }
  }

  const exportData = async () => {
    setExporting(true)
    setError("")
    try {
      const result = await profileApi.exportData()
      const blob = new Blob([JSON.stringify(result, null, 2)], {
        type: "application/json",
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `sharik-alomr-data-${new Date().toISOString().slice(0, 10)}.json`
      link.click()
      URL.revokeObjectURL(url)
      setSavedMessage(
        ar
          ? "تم تنزيل نسخة من بيانات حسابك."
          : "A copy of your account data was downloaded.",
      )
    } catch (reason) {
      setError(
        errorText(
          reason,
          ar ? "تعذّر تصدير البيانات." : "Could not export your data.",
        ),
      )
    } finally {
      setExporting(false)
    }
  }

  const uploadPhoto = async (file: File) => {
    setError("")
    setSavedMessage("")
    setPhotoBusy(true)
    try {
      const uploaded = await mediaApi.upload(file, "profile_photo")
      const result = await profileApi.addPhoto({
        storageKey: uploaded.storageKey,
        category: "public",
        isPrimary: true,
      })
      setData((current) =>
        current
          ? {
              ...current,
              photos: [
                result.photo,
                ...current.photos.map((photo) => ({
                  ...photo,
                  isPrimary: false,
                })),
              ],
            }
          : current,
      )
      setAvatar(result.photo.url)
      setSavedMessage(
        ar
          ? "تم رفع الصورة وحفظها في ملفك."
          : "The photo was uploaded and saved to your profile.",
      )
    } catch (reason) {
      setError(
        errorText(
          reason,
          ar ? "تعذّر رفع الصورة." : "Could not upload the photo.",
        ),
      )
    } finally {
      setPhotoBusy(false)
    }
  }

  const removePhoto = async (id: string, url: string) => {
    setError("")
    try {
      await profileApi.removePhoto(id)
      setData((current) =>
        current
          ? {
              ...current,
              photos: current.photos.filter((photo) => photo.id !== id),
            }
          : current,
      )
      setAvatar((current) => (current === url ? "" : current))
      setSavedMessage(ar ? "تم حذف الصورة." : "The photo was removed.")
    } catch (reason) {
      setError(
        errorText(
          reason,
          ar ? "تعذّر حذف الصورة." : "Could not remove the photo.",
        ),
      )
    }
  }

  const deleteAccount = async () => {
    if (deleteForm.confirmation.trim().toUpperCase() !== "DELETE") {
      setError(
        ar ? "اكتب DELETE لتأكيد حذف الحساب." : "Type DELETE to confirm account deletion.",
      )
      return
    }
    setDeleteBusy(true)
    setError("")
    try {
      await profileApi.deleteAccount({
        password: deleteForm.password || undefined,
        confirmation: "DELETE",
      })
      window.location.href = "/"
    } catch (reason) {
      setError(
        errorText(
          reason,
          ar ? "تعذّر حذف الحساب." : "Could not delete the account.",
        ),
      )
    } finally {
      setDeleteBusy(false)
    }
  }

  const toggleRow = (
    label: string,
    description: string,
    checked: boolean,
    onToggle: () => void,
    key: string,
    disabled = false,
  ) => (
    <div className={`toggle-row${disabled ? " disabled" : ""}`} key={key}>
      <div>
        <b>{label}</b>
        <p>{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={`toggle ${checked ? "on" : ""}`}
        onClick={onToggle}
        disabled={disabled}
      >
        <i />
      </button>
    </div>
  )

  const heading = sectionDefs.find((entry) => entry.key === section)
  const countryOptions =
    form.country && !countryChoices.some((item) => item.code === form.country)
      ? [
          { code: form.country, ar: form.country, en: form.country },
          ...countryChoices,
        ]
      : countryChoices
  const deleteAllowed = deleteForm.confirmation.trim().toUpperCase() === "DELETE"
  const twoFactorReady = Boolean(
    data?.user.phone &&
      data.user.phoneVerifiedAt &&
      !data.user.phone.startsWith("google_"),
  )

  return (
    <div className="settings-layout">
      <nav>
        {sectionDefs.map((item) => (
          <button
            className={section === item.key ? "active" : ""}
            onClick={() => {
              setSection(item.key)
              setError("")
              setSavedMessage("")
              setPasswordMessage("")
            }}
            key={item.key}
          >
            {ar ? item.ar : item.en}
            <Icon name="arrow" size={16} />
          </button>
        ))}
      </nav>
      <section className="settings-card">
        <div className="settings-heading">
          <h2>{heading ? (ar ? heading.ar : heading.en) : ""}</h2>
          <p>
            {profile
              ? ar
                ? "حدّثي المعلومات التي تساعد على تقديم ترشيحات مناسبة، ويمكنك التحكم في ظهورها."
                : "Update the information that supports suitable recommendations, and control how it appears."
              : ar
                ? "تحكّمي في المعلومات التي تظهر وطريقة حماية حسابك والإشعارات."
                : "Control what appears, how your account is protected, and your notifications."}
          </p>
          {data && (
            <small className="completion-note">
              {ar
                ? `اكتمال الملف ${data.completion.percent}%`
                : `Profile completion ${data.completion.percent}%`}
            </small>
          )}
        </div>
        {loading ? (
          <LoadingCard language={language} />
        ) : !data ? (
          <div className="empty-state">
            {error ||
              (ar ? "تعذّر تحميل الإعدادات." : "Could not load settings.")}
          </div>
        ) : (
          <>
            {section === "basics" && (
              <>
                <div className="profile-editor">
                  {avatar ? (
                    <SafeImage
                      src={avatar}
                      alt={ar ? "صورتك الشخصية" : "Your profile photo"}
                      fallback={
                        <span className="profile-avatar-fallback">
                          <Icon name="user" size={30} />
                        </span>
                      }
                    />
                  ) : (
                    <span className="profile-avatar-fallback">
                      <Icon name="user" size={30} />
                    </span>
                  )}
                  <div>
                    <label className="btn btn-soft avatar-upload">
                      {photoBusy
                        ? ar
                          ? "جارٍ رفع الصورة…"
                          : "Uploading…"
                        : ar
                          ? "اختيار صورة"
                          : "Choose a photo"}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        disabled={photoBusy}
                        onChange={(event) => {
                          const file = event.target.files?.[0]
                          event.target.value = ""
                          if (!file) return
                          if (file.size > 5 * 1024 * 1024) {
                            setError(
                              ar
                                ? "يجب ألا يتجاوز حجم الصورة 5 ميجابايت."
                                : "The image must not exceed 5MB.",
                            )
                            return
                          }
                          void uploadPhoto(file)
                        }}
                      />
                    </label>
                    <small>
                      {ar
                        ? "JPG أو PNG أو WebP حتى 5 ميجابايت. تُحفظ الصورة في حسابك مباشرة."
                        : "JPG, PNG, or WebP up to 5MB. The photo is saved to your account immediately."}
                    </small>
                  </div>
                </div>
                {data.photos.length > 0 && (
                  <div className="settings-photos">
                    {data.photos.map((photo) => (
                      <div key={photo.id}>
                        <img
                          src={photo.url}
                          alt={ar ? "صورة محفوظة" : "Saved photo"}
                        />
                        <button
                          type="button"
                          aria-label={ar ? "حذف الصورة" : "Delete photo"}
                          onClick={() => void removePhoto(photo.id, photo.url)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="form-grid">
                  <label>
                    {ar ? "الاسم الأول" : "First name"}
                    <input
                      value={form.firstName}
                      onChange={(event) =>
                        setField("firstName", event.target.value)
                      }
                    />
                  </label>
                  <label>
                    {ar ? "اسم العائلة" : "Last name"}
                    <input
                      value={form.lastName}
                      onChange={(event) =>
                        setField("lastName", event.target.value)
                      }
                    />
                  </label>
                  <label>
                    {ar ? "تاريخ الميلاد" : "Date of birth"}
                    <input
                      type="date"
                      value={form.birth}
                      onChange={(event) =>
                        setField("birth", event.target.value)
                      }
                    />
                  </label>
                  <label>
                    {ar ? "المدينة" : "City"}
                    <input
                      value={form.city}
                      onChange={(event) => setField("city", event.target.value)}
                    />
                  </label>
                  <label>
                    {ar ? "الدولة" : "Country"}
                    <select
                      value={form.country}
                      onChange={(event) =>
                        setField("country", event.target.value)
                      }
                    >
                      {countryOptions.map((country) => (
                        <option value={country.code} key={country.code}>
                          {ar ? country.ar : country.en}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {ar ? "المؤهل الدراسي" : "Education level"}
                    <select
                      value={form.education}
                      onChange={(event) =>
                        setField("education", event.target.value)
                      }
                    >
                      <option value="">{ar ? "غير محدد" : "Not set"}</option>
                      {educationChoices.map((option) => (
                        <option value={option.value} key={option.value}>
                          {ar ? option.ar : option.en}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {ar ? "الحالة الاجتماعية" : "Marital status"}
                    <select
                      value={form.maritalStatus}
                      onChange={(event) =>
                        setField("maritalStatus", event.target.value)
                      }
                    >
                      <option value="">{ar ? "غير محدد" : "Not set"}</option>
                      <option value="single">
                        {ar ? "لم يسبق له/لها الزواج" : "Never married"}
                      </option>
                      <option value="divorced">
                        {ar ? "مطلق/ـة" : "Divorced"}
                      </option>
                      <option value="widowed">
                        {ar ? "أرمل/ـة" : "Widowed"}
                      </option>
                    </select>
                  </label>
                  <label>
                    {ar ? "المهنة" : "Profession"}
                    <input
                      value={form.profession}
                      onChange={(event) =>
                        setField("profession", event.target.value)
                      }
                    />
                  </label>
                  <label>
                    {ar ? "نطاق الدخل" : "Income range"}
                    <input
                      value={form.income}
                      onChange={(event) =>
                        setField("income", event.target.value)
                      }
                      placeholder={ar ? "أفضل عدم الإفصاح" : "Prefer not to say"}
                    />
                  </label>
                  <label>
                    {ar ? "الطول (سم)" : "Height (cm)"}
                    <input
                      type="number"
                      min="120"
                      max="230"
                      value={form.height}
                      onChange={(event) =>
                        setField("height", event.target.value)
                      }
                    />
                  </label>
                  <label>
                    {ar ? "اللغات" : "Languages"}
                    <input
                      value={form.languages}
                      onChange={(event) =>
                        setField("languages", event.target.value)
                      }
                      placeholder={ar ? "العربية، الإنجليزية" : "Arabic, English"}
                    />
                  </label>
                  <label className="wide">
                    {ar ? "نبذة عني" : "About me"}
                    <textarea
                      maxLength={1000}
                      value={form.bio}
                      onChange={(event) => setField("bio", event.target.value)}
                    />
                    <small>{form.bio.length}/1000</small>
                  </label>
                </div>
              </>
            )}
            {section === "lifestyle" && (
              <div className="form-grid">
                <label>
                  {ar ? "التدخين" : "Smoking"}
                  <select
                    value={form.smoking}
                    onChange={(event) =>
                      setField("smoking", event.target.value)
                    }
                  >
                    <option value="">{ar ? "غير محدد" : "Not set"}</option>
                    <option value="no">{ar ? "لا أدخن" : "I don't smoke"}</option>
                    <option value="sometimes">
                      {ar ? "أدخن أحيانًا" : "I smoke occasionally"}
                    </option>
                    <option value="yes">{ar ? "أدخن" : "I smoke"}</option>
                  </select>
                </label>
                <label>
                  {ar ? "الرغبة في الإنجاب" : "Children"}
                  <select
                    value={form.wantsChildren}
                    onChange={(event) =>
                      setField("wantsChildren", event.target.value)
                    }
                  >
                    <option value="">{ar ? "غير محدد" : "Not set"}</option>
                    <option value="yes">
                      {ar ? "أرغب في الإنجاب" : "I would like children"}
                    </option>
                    <option value="no">
                      {ar ? "لا أرغب في الإنجاب" : "I do not want children"}
                    </option>
                    <option value="undecided">
                      {ar ? "أرغب في مناقشة الأمر" : "I would like to discuss it"}
                    </option>
                  </select>
                </label>
                <label>
                  {ar ? "اهتماماتي" : "My interests"}
                  <input
                    value={form.interests}
                    onChange={(event) =>
                      setField("interests", event.target.value)
                    }
                    placeholder={ar ? "القراءة، التطوع، السفر" : "Reading, volunteering, travel"}
                  />
                </label>
                <label>
                  {ar ? "سمات شخصيتي" : "Personality traits"}
                  <input
                    value={form.personality}
                    onChange={(event) =>
                      setField("personality", event.target.value)
                    }
                    placeholder={ar ? "هادئ، عملي، اجتماعي" : "Calm, practical, social"}
                  />
                </label>
                <label>
                  {ar ? "نمط حياتي" : "Lifestyle"}
                  <input
                    value={form.lifestyle}
                    onChange={(event) =>
                      setField("lifestyle", event.target.value)
                    }
                    placeholder={ar ? "متوازن، نشط" : "Balanced, active"}
                  />
                </label>
              </div>
            )}
            {section === "marriage" && (
              <div className="form-grid">
                <label>
                  {ar ? "نية الزواج" : "Marriage intention"}
                  <select
                    value={form.marriageIntent}
                    onChange={(event) =>
                      setField("marriageIntent", event.target.value)
                    }
                  >
                    <option value="">{ar ? "غير محدد" : "Not set"}</option>
                    <option value="serious_marriage">
                      {ar ? "زواج جاد" : "Serious marriage"}
                    </option>
                    <option value="dating_first">
                      {ar ? "تعارف أولًا" : "Dating first"}
                    </option>
                    <option value="matchmaking_for_other">
                      {ar ? "لشخص آخر" : "For someone else"}
                    </option>
                  </select>
                </label>
                <label>
                  {ar ? "التوقيت المتوقع" : "Expected timeline"}
                  <select
                    value={form.marriageTimeline}
                    onChange={(event) =>
                      setField("marriageTimeline", event.target.value)
                    }
                  >
                    <option value="">{ar ? "غير محدد" : "Not set"}</option>
                    <option value="months_6">
                      {ar ? "خلال 6 أشهر" : "Within 6 months"}
                    </option>
                    <option value="months_12">
                      {ar ? "خلال سنة" : "Within a year"}
                    </option>
                    <option value="months_24">
                      {ar ? "خلال سنتين" : "Within two years"}
                    </option>
                    <option value="unspecified">
                      {ar ? "مرن" : "Flexible"}
                    </option>
                  </select>
                </label>
                <label>
                  {ar ? "الأبناء" : "Children"}
                  <select
                    value={form.wantsChildren}
                    onChange={(event) =>
                      setField("wantsChildren", event.target.value)
                    }
                  >
                    <option value="">{ar ? "غير محدد" : "Not set"}</option>
                    <option value="yes">
                      {ar ? "أرغب في الإنجاب" : "I would like children"}
                    </option>
                    <option value="no">
                      {ar ? "لا أرغب في الإنجاب" : "I do not want children"}
                    </option>
                    <option value="undecided">
                      {ar ? "قابلة للنقاش" : "Open to discussion"}
                    </option>
                  </select>
                </label>
                <label>
                  {ar ? "الاستعداد للانتقال" : "Willingness to relocate"}
                  <select
                    value={form.relocation}
                    onChange={(event) =>
                      setField("relocation", event.target.value)
                    }
                  >
                    <option value="">{ar ? "غير محدد" : "Not set"}</option>
                    <option value="willing">{ar ? "نعم" : "Yes"}</option>
                    <option value="unwilling">{ar ? "لا" : "No"}</option>
                    <option value="conditional">
                      {ar ? "قابلة للنقاش" : "Open to discussion"}
                    </option>
                  </select>
                </label>
                <label>
                  {ar ? "مكان السكن" : "Living preference"}
                  <select
                    value={form.livingPreference}
                    onChange={(event) =>
                      setField("livingPreference", event.target.value)
                    }
                  >
                    <option value="">{ar ? "غير محدد" : "Not set"}</option>
                    <option value="independent_home">
                      {ar ? "منزل مستقل" : "Independent home"}
                    </option>
                    <option value="family_home">
                      {ar ? "منزل العائلة" : "Family home"}
                    </option>
                    <option value="unspecified">
                      {ar ? "قابلة للنقاش" : "Open to discussion"}
                    </option>
                  </select>
                </label>
                <label>
                  {ar ? "التفضيلات الدينية" : "Religious preferences"}
                  <input
                    value={form.religion}
                    onChange={(event) =>
                      setField("religion", event.target.value)
                    }
                  />
                </label>
                <label>
                  {ar ? "العمر من" : "Age from"}
                  <input
                    type="number"
                    min="18"
                    max="80"
                    value={form.ageMin}
                    onChange={(event) =>
                      setField("ageMin", event.target.value)
                    }
                  />
                </label>
                <label>
                  {ar ? "العمر إلى" : "Age to"}
                  <input
                    type="number"
                    min="18"
                    max="80"
                    value={form.ageMax}
                    onChange={(event) =>
                      setField("ageMax", event.target.value)
                    }
                  />
                </label>
                <label>
                  {ar ? "الطول من (سم)" : "Height from (cm)"}
                  <input
                    type="number"
                    min="120"
                    max="230"
                    value={form.heightMin}
                    onChange={(event) =>
                      setField("heightMin", event.target.value)
                    }
                  />
                </label>
                <label>
                  {ar ? "الطول إلى (سم)" : "Height to (cm)"}
                  <input
                    type="number"
                    min="120"
                    max="230"
                    value={form.heightMax}
                    onChange={(event) =>
                      setField("heightMax", event.target.value)
                    }
                  />
                </label>
                <label className="wide">
                  {ar ? "الدول المقبولة" : "Acceptable countries"}
                  <input
                    value={form.countries}
                    onChange={(event) =>
                      setField("countries", event.target.value)
                    }
                    placeholder={ar ? "مصر، السعودية" : "Egypt, Saudi Arabia"}
                  />
                </label>
              </div>
            )}
            {section === "dealBreakers" && (
              <div className="deal-breakers">
                {(catalog?.dealBreakers ?? []).map((item) => (
                  <label key={item.key}>
                    <input
                      type="checkbox"
                      checked={dealBreakers.includes(item.key)}
                      onChange={() => toggleBreaker(item.key)}
                    />
                    <span>
                      {ar ? item.labelAr : item.labelEn ?? item.labelAr}
                    </span>
                  </label>
                ))}
                {(catalog?.dealBreakers ?? []).length === 0 && (
                  <div className="empty-state">
                    {ar
                      ? "لا توجد خيارات متاحة حاليًا."
                      : "No options are available right now."}
                  </div>
                )}
                <p>
                  {ar
                    ? "تُستخدم هذه الاختيارات لاستبعاد الترشيحات غير المناسبة من نتائج البحث."
                    : "These choices are used to exclude unsuitable recommendations from search results."}
                </p>
              </div>
            )}
            {section === "privacy" && (
              <>
                <div className="form-grid">
                  <label className="wide">
                    {ar ? "من يمكنه رؤية ملفي" : "Who can see my profile"}
                    <select
                      value={privacy.profileVisibility}
                      onChange={(event) =>
                        setPrivacy({
                          ...privacy,
                          profileVisibility: event.target.value,
                        })
                      }
                    >
                      <option value="public">
                        {ar ? "الجميع" : "Everyone"}
                      </option>
                      <option value="matches">
                        {ar ? "التطابقات فقط" : "Matches only"}
                      </option>
                      <option value="private">
                        {ar ? "أنا فقط" : "Only me"}
                      </option>
                    </select>
                  </label>
                </div>
                {toggleRow(
                  ar ? "إظهار ملفي في نتائج البحث" : "Show my profile in search",
                  ar
                    ? "إيقافه يخفي ملفك عن الترشيحات."
                    : "Turning this off hides your profile from recommendations.",
                  privacy.searchable,
                  () => togglePrivacy("searchable"),
                  "searchable",
                )}
                {toggleRow(
                  ar ? "إظهار حالة الاتصال" : "Show online status",
                  ar
                    ? "تحكّمي في ظهور حالة نشاطك."
                    : "Control whether your activity status is visible.",
                  privacy.showOnlineStatus,
                  () => togglePrivacy("showOnlineStatus"),
                  "showOnlineStatus",
                )}
                {toggleRow(
                  ar ? "إخفاء آخر ظهور" : "Hide last seen",
                  ar ? "إخفاء وقت آخر نشاط." : "Hide your last active time.",
                  privacy.hideLastSeen,
                  () => togglePrivacy("hideLastSeen"),
                  "hideLastSeen",
                )}
                {toggleRow(
                  ar ? "إظهار المحافظة فقط" : "Show governorate only",
                  ar
                    ? "يظهر اسم المدينة أو المحافظة فقط، لا موقعك الدقيق."
                    : "Only the city or governorate is shown, not your precise location.",
                  privacy.cityOnlyLocation,
                  () => togglePrivacy("cityOnlyLocation"),
                  "cityOnlyLocation",
                )}
                {toggleRow(
                  ar ? "طلبات الصور الخاصة" : "Private photo requests",
                  ar
                    ? "تتطلب الصور الخاصة موافقتك قبل عرضها."
                    : "Private photos require your approval before they are shown.",
                  privacy.privatePhotosNeedApproval,
                  () => togglePrivacy("privatePhotosNeedApproval"),
                  "privatePhotosNeedApproval",
                )}
                {toggleRow(
                  ar ? "موافقة على صور الملف" : "Profile photo approval",
                  ar
                    ? "راجعي صور الملف قبل ظهورها للآخرين."
                    : "Review profile photos before they appear to others.",
                  privacy.profilePhotosNeedApproval,
                  () => togglePrivacy("profilePhotosNeedApproval"),
                  "profilePhotosNeedApproval",
                )}
                {toggleRow(
                  ar ? "علامة مائية على الصور" : "Watermark photos",
                  ar
                    ? "إضافة علامة مائية تحمي صورك من إعادة النشر."
                    : "Add a watermark to protect your photos from being reused.",
                  privacy.watermarkPhotos,
                  () => togglePrivacy("watermarkPhotos"),
                  "watermarkPhotos",
                )}
                <div className="toggle-row">
                  <div>
                    <b>{ar ? "نسخة من بياناتي" : "Copy of my data"}</b>
                    <p>
                      {ar
                        ? "نزّلي نسخة JSON من بيانات حسابك داخل المنصة."
                        : "Download a JSON copy of your account data."}
                    </p>
                  </div>
                  <Button
                    kind="soft"
                    disabled={exporting}
                    onClick={() => void exportData()}
                  >
                    {exporting
                      ? ar
                        ? "جارٍ التصدير…"
                        : "Exporting…"
                      : ar
                        ? "تصدير البيانات"
                        : "Export data"}
                  </Button>
                </div>
                <div className="danger-zone">
                  <div>
                    <b>{ar ? "حذف الحساب" : "Delete account"}</b>
                    <p>
                      {ar
                        ? "سيتم تعطيل الحساب وحذف بياناته الشخصية. لا يمكن التراجع عن هذه العملية."
                        : "The account will be deactivated and its personal data removed. This cannot be undone."}
                    </p>
                  </div>
                  <Button
                    kind="outline"
                    onClick={() => setShowDelete(!showDelete)}
                  >
                    {showDelete
                      ? ar
                        ? "إلغاء"
                        : "Cancel"
                      : ar
                        ? "إدارة الحذف"
                        : "Manage deletion"}
                  </Button>
                </div>
                {showDelete && (
                  <div className="delete-account-box">
                    {data.user.hasPassword && (
                      <label>
                        {ar ? "كلمة المرور الحالية" : "Current password"}
                        <input
                          type="password"
                          value={deleteForm.password}
                          onChange={(event) =>
                            setDeleteForm({
                              ...deleteForm,
                              password: event.target.value,
                            })
                          }
                        />
                      </label>
                    )}
                    <label>
                      {ar
                        ? "اكتب DELETE للتأكيد"
                        : "Type DELETE to confirm"}
                      <input
                        value={deleteForm.confirmation}
                        onChange={(event) =>
                          setDeleteForm({
                            ...deleteForm,
                            confirmation: event.target.value,
                          })
                        }
                        placeholder="DELETE"
                      />
                    </label>
                    <Button
                      kind="outline"
                      disabled={deleteBusy || !deleteAllowed}
                      onClick={() => void deleteAccount()}
                    >
                      {deleteBusy
                        ? ar
                          ? "جارٍ الحذف…"
                          : "Deleting…"
                        : ar
                          ? "تأكيد حذف الحساب"
                          : "Confirm account deletion"}
                    </Button>
                  </div>
                )}
              </>
            )}
            {section === "security" && (
              <>
                <div className="verification-options">
                  <article>
                    <b>{ar ? "رقم الهاتف" : "Phone number"}</b>
                    <span>
                      {data.user.phoneVerifiedAt
                        ? ar
                          ? "موثّق"
                          : "Verified"
                        : ar
                          ? "غير موثّق"
                          : "Not verified"}
                    </span>
                    <small>{data.user.phone}</small>
                  </article>
                  <article>
                    <b>{ar ? "البريد الإلكتروني" : "Email address"}</b>
                    <span>
                      {data.user.emailVerifiedAt
                        ? ar
                          ? "موثّق"
                          : "Verified"
                        : data.user.email
                          ? ar
                            ? "غير موثّق"
                            : "Not verified"
                          : ar
                            ? "غير مضاف"
                            : "Not added"}
                    </span>
                    <small>{data.user.email ?? "—"}</small>
                  </article>
                </div>
                <div className="settings-heading security-heading">
                  <h2>{ar ? "رقم الهاتف" : "Phone number"}</h2>
                  <p>
                    {ar
                      ? "نستخدم رقمك الموثّق للتحقق بخطوتين واستعادة الحساب. تغيير الرقم يتطلب كود تحقق."
                      : "Your verified number is used for two-step verification and account recovery. Changing it requires a verification code."}
                  </p>
                </div>
                <form
                  className="form-grid"
                  onSubmit={
                    phoneCodeSent ? verifyPhoneChange : startPhoneChange
                  }
                >
                  <label className="wide">
                    {ar ? "رقم الهاتف الجديد" : "New phone number"}
                    <input
                      value={phoneForm.phone}
                      onChange={(event) =>
                        setPhoneForm({ ...phoneForm, phone: event.target.value })
                      }
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="01xxxxxxxxx"
                      dir="ltr"
                      disabled={phoneCodeSent}
                    />
                  </label>
                  {phoneCodeSent && (
                    <label className="wide">
                      {ar ? "كود التحقق" : "Verification code"}
                      <input
                        value={phoneForm.code}
                        onChange={(event) =>
                          setPhoneForm({
                            ...phoneForm,
                            code: event.target.value
                              .replace(/\D/g, "")
                              .slice(0, 5),
                          })
                        }
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={5}
                        dir="ltr"
                        autoFocus
                      />
                    </label>
                  )}
                  {phoneDevCode && (
                    <p className="inline-feedback info wide" dir="ltr">
                      {ar ? "كود التطوير: " : "Dev code: "}
                      <b>{phoneDevCode}</b>
                    </p>
                  )}
                  <div className="wide phone-change-actions">
                    <Button type="submit" disabled={phoneBusy}>
                      {phoneBusy
                        ? ar
                          ? "جارٍ التنفيذ…"
                          : "Working…"
                        : phoneCodeSent
                          ? ar
                            ? "تأكيد الرقم الجديد"
                            : "Confirm new number"
                          : ar
                            ? "إرسال كود التحقق"
                            : "Send verification code"}
                    </Button>
                    {phoneCodeSent && (
                      <button
                        type="button"
                        className="auth-method-link"
                        onClick={() => {
                          setPhoneCodeSent(false)
                          setPhoneForm({ phone: "", code: "" })
                          setPhoneDevCode("")
                        }}
                      >
                        {ar ? "إلغاء" : "Cancel"}
                      </button>
                    )}
                  </div>
                </form>
                {toggleRow(
                  ar ? "التحقق بخطوتين" : "Two-step verification",
                  twoFactorReady
                    ? ar
                      ? "نرسل رمزًا إلى هاتفك الموثّق عند كل تسجيل دخول بكلمة المرور أو Google."
                      : "We send a code to your verified phone at every password or Google sign-in."
                    : ar
                      ? "يتطلب رقم هاتف موثّقًا. أضف رقمك من قسم رقم الهاتف أعلاه."
                      : "Requires a verified phone number. Add one in the phone section above.",
                  twoFactorReady && notificationPrefs.twoFactorEnabled,
                  () => toggleNotification("twoFactorEnabled"),
                  "twoFactorEnabled",
                  !twoFactorReady,
                )}
                {toggleRow(
                  ar ? "تنبيهات الدخول الجديد" : "New login alerts",
                  ar
                    ? "إشعار عند تسجيل الدخول من جهاز جديد."
                    : "Notify me when a new device signs in.",
                  notificationPrefs.newLoginAlerts,
                  () => toggleNotification("newLoginAlerts"),
                  "newLoginAlerts",
                )}
                <div className="settings-heading security-heading">
                  <h2>
                    {data.user.hasPassword
                      ? ar
                        ? "تغيير كلمة المرور"
                        : "Change password"
                      : ar
                        ? "تعيين كلمة المرور"
                        : "Set a password"}
                  </h2>
                  <p>
                    {ar
                      ? "سيتم إلغاء الجلسات الأخرى بعد التحديث."
                      : "Other sessions will be revoked after the update."}
                  </p>
                </div>
                <form className="form-grid" onSubmit={changePassword}>
                  {data.user.hasPassword && (
                    <label className="wide">
                      {ar ? "كلمة المرور الحالية" : "Current password"}
                      <input
                        type="password"
                        autoComplete="current-password"
                        value={passwordForm.current}
                        onChange={(event) =>
                          setPasswordForm({
                            ...passwordForm,
                            current: event.target.value,
                          })
                        }
                      />
                    </label>
                  )}
                  <label>
                    {ar ? "كلمة المرور الجديدة" : "New password"}
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={passwordForm.next}
                      onChange={(event) =>
                        setPasswordForm({
                          ...passwordForm,
                          next: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    {ar ? "تأكيد كلمة المرور" : "Confirm password"}
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={passwordForm.confirm}
                      onChange={(event) =>
                        setPasswordForm({
                          ...passwordForm,
                          confirm: event.target.value,
                        })
                      }
                    />
                  </label>
                  <div className="wide">
                    <Button type="submit" disabled={passwordBusy}>
                      {passwordBusy
                        ? ar
                          ? "جارٍ التحديث…"
                          : "Updating…"
                        : data.user.hasPassword
                          ? ar
                            ? "تغيير كلمة المرور"
                            : "Change password"
                          : ar
                            ? "تعيين كلمة المرور"
                            : "Set password"}
                    </Button>
                  </div>
                </form>
                {passwordMessage && (
                  <p className="inline-feedback" role="status">
                    {passwordMessage}
                  </p>
                )}
                <div className="safety-reminder">
                  <Icon name="lock" />
                  <div>
                    <b>
                      {ar
                        ? "حماية الجهاز والجلسة"
                        : "Device and session protection"}
                    </b>
                    <p>
                      {ar
                        ? "تنبيهات الدخول الجديد تُسجّل داخل المنصة. ربط الأجهزة واكتشاف الدخول المشبوه يحتاج مراجعة أمنية دورية."
                        : "New login alerts are recorded inside the platform. Device binding and suspicious-login detection require periodic security review."}
                    </p>
                  </div>
                </div>
              </>
            )}
            {section === "notifications" && (
              <>
                {toggleRow(
                  ar ? "طلبات الاهتمام" : "Interest requests",
                  ar
                    ? "إشعار عند استلام اهتمام جديد."
                    : "Notify me when a new interest arrives.",
                  notificationPrefs.match,
                  () => toggleNotification("match"),
                  "match",
                )}
                {toggleRow(
                  ar ? "الرسائل" : "Messages",
                  ar
                    ? "تنبيه عند وصول رسالة جديدة."
                    : "Alert me when a new message arrives.",
                  notificationPrefs.messages,
                  () => toggleNotification("messages"),
                  "messages",
                )}
                {toggleRow(
                  ar ? "المكالمات" : "Calls",
                  ar
                    ? "تنبيه عند بدء مكالمة أو فواتها."
                    : "Alert me when a call starts or is missed.",
                  notificationPrefs.calls,
                  () => toggleNotification("calls"),
                  "calls",
                )}
                {toggleRow(
                  ar ? "تفاعلات المجتمع" : "Community interactions",
                  ar
                    ? "الإعجابات والتعليقات والردود."
                    : "Likes, comments, and replies.",
                  notificationPrefs.community,
                  () => toggleNotification("community"),
                  "community",
                )}
                {toggleRow(
                  ar ? "ملخص أسبوعي بالبريد" : "Weekly email summary",
                  ar
                    ? "ملخص أسبوعي بالترشيحات والنشاط."
                    : "A weekly summary of recommendations and activity.",
                  notificationPrefs.emailWeekly,
                  () => toggleNotification("emailWeekly"),
                  "emailWeekly",
                )}
              </>
            )}
          </>
        )}
        {error && (
          <p className="inline-feedback" role="alert">
            {error}
          </p>
        )}
        {savedMessage && (
          <p className="inline-feedback" role="status">
            {savedMessage}
          </p>
        )}
        {!loading && data && (
          <div className="settings-actions">
            <Button disabled={saving} onClick={() => void saveCurrent()}>
              {saving
                ? ar
                  ? "جارٍ الحفظ…"
                  : "Saving…"
                : section === "security"
                  ? ar
                    ? "حفظ إعدادات الأمان"
                    : "Save security settings"
                  : ar
                    ? "حفظ التغييرات"
                    : "Save changes"}
            </Button>
          </div>
        )}
      </section>
    </div>
  )
}

function BottomNav({
  view,
  setView,
  language,
}: {
  view: string
  setView: (v: string) => void
  language: Language
}) {
  const ar = language === "ar"
  const primaryItems = navItems.filter(([, , , key]) =>
    ["dashboard", "matches", "search", "interests", "messages"].includes(key),
  )
  const secondaryItems = navItems.filter(
    ([, , , key]) =>
      !["dashboard", "matches", "search", "interests", "messages"].includes(
        key,
      ),
  )
  const [moreOpen, setMoreOpen] = useState(false)
  return (
    <>
      {moreOpen && (
        <nav
          className="bottom-nav-more"
          aria-label={ar ? "المزيد من الصفحات" : "More pages"}
        >
          {secondaryItems.map(([icon, arLabel, enLabel, key]) => (
            <button
              className={view === key ? "active" : ""}
              onClick={() => {
                setView(key)
                setMoreOpen(false)
              }}
              key={key}
            >
              <Icon name={icon} />
              <span>{ar ? arLabel : enLabel}</span>
            </button>
          ))}
        </nav>
      )}
      <nav className="bottom-nav">
        {primaryItems.map(([icon, arLabel, enLabel, key]) => (
          <button
            className={view === key ? "active" : ""}
            onClick={() => {
              setView(key)
              setMoreOpen(false)
            }}
            key={key}
          >
            <Icon name={icon} />
            <span>{ar ? arLabel : enLabel}</span>
          </button>
        ))}
        <button
          className={moreOpen ? "active" : ""}
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen(!moreOpen)}
        >
          <Icon name="menu" />
          <span>{ar ? "المزيد" : "More"}</span>
        </button>
      </nav>
    </>
  )
}
