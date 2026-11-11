import { useCallback, useEffect, useState } from "react"
import type React from "react"
import {
  Button,
  Icon,
  Logo,
  type IconName,
  type Language,
  type PlanConfig,
} from "../app-shared"
import {
  ApiClientError,
  adminApi,
  type ApiAdmin,
  type ApiAdminAnalytics,
  type ApiAdminArticle,
  type ApiAdminAudit,
  type ApiAdminFlag,
  type ApiAdminOverview,
  type ApiAdminPackage,
  type ApiAdminPayment,
  type ApiAdminPlan,
  type ApiAdminPost,
  type ApiAdminReport,
  type ApiAdminRoleFull,
  type ApiAdminRow,
  type ApiAdminSetting,
  type ApiAdminSubscription,
  type ApiAdminTopic,
  type ApiAdminTwoFactorSetup,
  type ApiAdminTwoFactorStatus,
  type ApiAdminUser,
  type ApiAdminVerification,
} from "../lib/api"

// ───────────────────────── Helpers ─────────────────────────

function errorText(reason: unknown, fallback: string): string {
  return reason instanceof ApiClientError ? reason.message : fallback
}

function formatDate(value: string | null | undefined, language: Language) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return new Intl.DateTimeFormat(language === "ar" ? "ar-EG" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date)
}

function formatDateTime(value: string | null | undefined, language: Language) {
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

function formatNumber(value: number, language: Language) {
  return new Intl.NumberFormat(language === "ar" ? "ar-EG" : "en-GB").format(
    value,
  )
}

function personName(person: {
  firstName: string
  lastName?: string | null
}): string {
  return [person.firstName, person.lastName].filter(Boolean).join(" ")
}

const statusLabels: Record<string, [string, string]> = {
  active: ["نشط", "Active"],
  suspended: ["موقوف", "Suspended"],
  banned: ["محظور", "Banned"],
  deleted: ["محذوف", "Deleted"],
  draft: ["مسودة", "Draft"],
  pending: ["قيد الانتظار", "Pending"],
  processing: ["قيد المراجعة", "Processing"],
  approved: ["مقبول", "Approved"],
  rejected: ["مرفوض", "Rejected"],
  open: ["مفتوح", "Open"],
  reviewing: ["قيد المراجعة", "Reviewing"],
  resolved: ["محلول", "Resolved"],
  dismissed: ["متجاهل", "Dismissed"],
  published: ["منشور", "Published"],
  removed: ["محذوف", "Removed"],
  pending_review: ["بانتظار المراجعة", "Pending review"],
  scheduled: ["مجدول", "Scheduled"],
  succeeded: ["ناجح", "Succeeded"],
  failed: ["فشل", "Failed"],
  refunded: ["مسترد", "Refunded"],
  unverified: ["غير موثّق", "Unverified"],
  verified: ["موثّق", "Verified"],
}

function statusLabel(value: string, language: Language) {
  const entry = statusLabels[value]
  if (!entry) return value
  return language === "ar" ? entry[0] : entry[1]
}

function AdminLoading({ language }: { language: Language }) {
  return (
    <div className="admin-table">
      <p className="inline-feedback" role="status">
        {language === "ar" ? "جارٍ تحميل البيانات…" : "Loading data…"}
      </p>
    </div>
  )
}

function AdminError({
  message,
  language,
}: {
  message: string
  language: Language
}) {
  return (
    <div className="admin-table">
      <p className="inline-feedback" role="alert">
        {message ||
          (language === "ar"
            ? "تعذّر تحميل البيانات."
            : "Could not load the data.")}
      </p>
    </div>
  )
}

function AdminPager({
  page,
  pages,
  onPage,
  language,
}: {
  page: number
  pages: number
  onPage: (page: number) => void
  language: Language
}) {
  const ar = language === "ar"
  if (pages <= 1) return null
  return (
    <div className="pagination">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        {ar ? "السابق" : "Previous"}
      </button>
      <span>
        {ar ? `صفحة ${page} من ${pages}` : `Page ${page} of ${pages}`}
      </span>
      <button
        type="button"
        disabled={page >= pages}
        onClick={() => onPage(page + 1)}
      >
        {ar ? "التالي" : "Next"}
      </button>
    </div>
  )
}

type AdminActionConfig = {
  title: string
  description: string
  confirmLabel: string
  requireReason?: boolean
  run: (reason: string) => Promise<unknown>
  onSuccess?: () => void
}

function useAdminAction(language: Language) {
  const ar = language === "ar"
  const [config, setConfig] = useState<AdminActionConfig | null>(null)
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  const [dialogError, setDialogError] = useState("")

  const open = (next: AdminActionConfig) => {
    setReason("")
    setDialogError("")
    setConfig(next)
  }
  const close = () => {
    if (!busy) setConfig(null)
  }
  const submit = async () => {
    if (!config) return
    setBusy(true)
    setDialogError("")
    try {
      await config.run(reason.trim())
      setConfig(null)
      config.onSuccess?.()
    } catch (reasonValue) {
      setDialogError(
        errorText(
          reasonValue,
          ar ? "تعذّر تنفيذ الإجراء." : "Could not complete the action.",
        ),
      )
    } finally {
      setBusy(false)
    }
  }

  const dialog = config ? (
    <div className="modal-backdrop" role="presentation">
      <section
        className="confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-action-title"
      >
        <span>
          <Icon name="shield" />
        </span>
        <h2 id="admin-action-title">{config.title}</h2>
        <p>{config.description}</p>
        {config.requireReason && (
          <label>
            {ar ? "سبب الإجراء" : "Reason for action"}
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={
                ar
                  ? "اكتب سببًا واضحًا يُسجّل في سجل التدقيق"
                  : "Write a clear reason for the audit log"
              }
            />
          </label>
        )}
        {dialogError && (
          <p className="inline-feedback" role="alert">
            {dialogError}
          </p>
        )}
        <div>
          <Button kind="outline" onClick={close}>
            {ar ? "إلغاء" : "Cancel"}
          </Button>
          <Button
            disabled={
              busy || Boolean(config.requireReason && reason.trim().length < 3)
            }
            onClick={() => void submit()}
          >
            {busy
              ? ar
                ? "جارٍ التنفيذ…"
                : "Working…"
              : config.confirmLabel}
          </Button>
        </div>
      </section>
    </div>
  ) : null

  return { open, dialog }
}

// ───────────────────────── Overview ─────────────────────────

function AdminOverview({ language }: { language: Language }) {
  const ar = language === "ar"
  const [data, setData] = useState<ApiAdminOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await adminApi.overview())
      setError("")
    } catch (reason) {
      setError(
        errorText(
          reason,
          ar ? "تعذّر تحميل نظرة عامة." : "Could not load the overview.",
        ),
      )
    } finally {
      setLoading(false)
    }
  }, [ar])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) return <AdminLoading language={language} />
  if (!data) return <AdminError message={error} language={language} />

  const signups = data.signups.slice(-14)
  const maxSignup = Math.max(1, ...signups.map((entry) => entry.count))
  const kpis: Array<[IconName, string, number]> = [
    ["user", ar ? "إجمالي المستخدمين" : "Total users", data.counts.users],
    [
      "sparkles",
      ar ? "مستخدمون جدد (7 أيام)" : "New users (7 days)",
      data.counts.newUsers7,
    ],
    [
      "shield",
      ar ? "طلبات توثيق معلّقة" : "Pending verifications",
      data.counts.pendingVerifications,
    ],
    [
      "bell",
      ar ? "بلاغات مفتوحة" : "Open reports",
      data.counts.openReports,
    ],
  ]

  return (
    <>
      <div className="kpis">
        {kpis.map(([icon, label, value]) => (
          <article key={label}>
            <span>
              <Icon name={icon} />
            </span>
            <small>{label}</small>
            <b>{formatNumber(value, language)}</b>
            <em>{ar ? "مباشر من قاعدة البيانات" : "Live from the database"}</em>
          </article>
        ))}
      </div>
      <div className="admin-grid">
        <section className="chart-card">
          <div className="block-heading">
            <div>
              <h2>{ar ? "تسجيلات جديدة" : "New signups"}</h2>
              <p>
                {ar ? "آخر 14 يومًا" : "Last 14 days"} ·{" "}
                {formatNumber(data.counts.newUsers7, language)}{" "}
                {ar ? "خلال 7 أيام" : "in 7 days"}
              </p>
            </div>
            <button type="button" onClick={() => void load()}>
              {ar ? "تحديث" : "Refresh"} <Icon name="arrow" size={14} />
            </button>
          </div>
          <div className="bars">
            {signups.map((entry) => (
              <div key={entry.day}>
                <i
                  style={{
                    height: `${Math.max(5, (entry.count / maxSignup) * 100)}%`,
                  }}
                />
                <span>{entry.day.slice(5)}</span>
              </div>
            ))}
          </div>
          {signups.length === 0 && (
            <div className="empty-state">
              {ar ? "لا توجد تسجيلات حديثة." : "No recent signups."}
            </div>
          )}
        </section>
        <section className="moderation">
          <div className="block-heading">
            <h2>{ar ? "المؤشرات المالية" : "Financial health"}</h2>
          </div>
          <div className="donut">
            <b>{formatNumber(data.counts.activeSubscriptions, language)}</b>
            <small>{ar ? "اشتراك نشط" : "active subs"}</small>
          </div>
          <ul>
            <li>
              <i className="green" />
              {ar ? "إجمالي الإيرادات" : "Total revenue"}
              <b>{formatNumber(data.counts.revenue, language)}</b>
            </li>
            <li>
              <i className="gold" />
              {ar ? "التطابقات" : "Matches"}
              <b>{formatNumber(data.counts.matches, language)}</b>
            </li>
            <li>
              <i className="red" />
              {ar ? "الرسائل" : "Messages"}
              <b>{formatNumber(data.counts.messages, language)}</b>
            </li>
          </ul>
        </section>
      </div>
      <div className="admin-grid">
        <section className="admin-table table-scroll">
          <div className="block-heading">
            <div>
              <h2>{ar ? "أحدث المستخدمين" : "Newest users"}</h2>
              <p>
                {ar
                  ? "أحدث الحسابات المسجلة على المنصة"
                  : "The latest accounts on the platform"}
              </p>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>{ar ? "الاسم" : "Name"}</th>
                <th>{ar ? "الهاتف" : "Phone"}</th>
                <th>{ar ? "المدينة" : "City"}</th>
                <th>{ar ? "الحالة" : "Status"}</th>
                <th>{ar ? "التسجيل" : "Joined"}</th>
              </tr>
            </thead>
            <tbody>
              {data.recentUsers.map((user) => (
                <tr key={user.id}>
                  <td>{personName(user)}</td>
                  <td>{user.phone}</td>
                  <td>{user.city ?? "—"}</td>
                  <td>
                    <span className="status">
                      {statusLabel(user.accountStatus, language)}
                    </span>
                  </td>
                  <td>{formatDate(user.createdAt, language)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="admin-table">
          <div className="block-heading">
            <h2>{ar ? "أحدث إجراءات الإدارة" : "Latest admin actions"}</h2>
          </div>
          {data.recentAudit.map((entry) => (
            <div className="audit-item" key={entry.id}>
              <span>
                <Icon name="shield" size={16} />
              </span>
              <div>
                <b>{entry.action}</b>
                <small>
                  {entry.actorAdmin?.name ?? (ar ? "النظام" : "System")} ·{" "}
                  {formatDateTime(entry.createdAt, language)}
                </small>
              </div>
            </div>
          ))}
          {data.recentAudit.length === 0 && (
            <div className="empty-state">
              {ar ? "لا توجد إجراءات مسجلة." : "No audit actions yet."}
            </div>
          )}
        </section>
      </div>
      <section className="admin-table">
        <div className="block-heading">
          <h2>{ar ? "أهم المدن" : "Top cities"}</h2>
        </div>
        <div className="funnel-row">
          <span>{ar ? "المدينة" : "City"}</span>
          <div />
          <b>{ar ? "العدد" : "Count"}</b>
        </div>
        {data.topCities.map((entry) => (
          <div className="funnel-row" key={entry.city ?? "unknown"}>
            <span>{entry.city ?? (ar ? "غير محدد" : "Not set")}</span>
            <div>
              <i
                style={{
                  width: `${Math.max(
                    4,
                    (entry.count / Math.max(1, data.topCities[0]?.count ?? 1)) *
                      100,
                  )}%`,
                }}
              />
            </div>
            <b>{formatNumber(entry.count, language)}</b>
          </div>
        ))}
      </section>
    </>
  )
}

// ───────────────────────── Users ─────────────────────────

function AdminUsers({ language }: { language: Language }) {
  const ar = language === "ar"
  const [q, setQ] = useState("")
  const [status, setStatus] = useState("")
  const [page, setPage] = useState(1)
  const [data, setData] = useState<{
    results: ApiAdminUser[]
    total: number
    page: number
    pages: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const action = useAdminAction(language)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(
        await adminApi.users({
          q: q.trim() || undefined,
          status: status || undefined,
          page,
          limit: 25,
        }),
      )
      setError("")
    } catch (reason) {
      setError(
        errorText(
          reason,
          ar ? "تعذّر تحميل المستخدمين." : "Could not load users.",
        ),
      )
    } finally {
      setLoading(false)
    }
  }, [q, status, page, ar])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load()
    }, 250)
    return () => window.clearTimeout(timer)
  }, [load])

  const changeStatus = (user: ApiAdminUser, nextStatus: string) => {
    action.open({
      title:
        nextStatus === "active"
          ? ar
            ? "إعادة تفعيل الحساب"
            : "Reactivate account"
          : ar
            ? "تغيير حالة الحساب"
            : "Change account status",
      description: `${personName(user)} · ${user.phone}`,
      confirmLabel: ar ? "تأكيد الإجراء" : "Confirm action",
      requireReason: true,
      run: (reason) => adminApi.updateUserStatus(user.id, nextStatus, reason),
      onSuccess: () => void load(),
    })
  }

  return (
    <>
      <div className="admin-toolbar">
        <div className="admin-search">
          <Icon name="search" size={16} />
          <input
            value={q}
            onChange={(event) => {
              setQ(event.target.value)
              setPage(1)
            }}
            placeholder={
              ar
                ? "ابحث بالاسم أو الهاتف أو البريد"
                : "Search by name, phone or email"
            }
          />
        </div>
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value)
            setPage(1)
          }}
        >
          <option value="">{ar ? "كل الحالات" : "All statuses"}</option>
          <option value="active">{ar ? "نشط" : "Active"}</option>
          <option value="suspended">{ar ? "موقوف" : "Suspended"}</option>
          <option value="banned">{ar ? "محظور" : "Banned"}</option>
          <option value="deleted">{ar ? "محذوف" : "Deleted"}</option>
        </select>
        <Button kind="soft" onClick={() => void load()}>
          {ar ? "تحديث" : "Refresh"}
        </Button>
      </div>
      {error && <AdminError message={error} language={language} />}
      {loading ? (
        <AdminLoading language={language} />
      ) : data ? (
        <section className="admin-table table-scroll">
          <div className="block-heading">
            <div>
              <h2>{ar ? "المستخدمون" : "Users"}</h2>
              <p>
                {ar
                  ? `${formatNumber(data.total, language)} حساب`
                  : `${formatNumber(data.total, language)} accounts`}
              </p>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>{ar ? "المستخدم" : "User"}</th>
                <th>{ar ? "الهاتف" : "Phone"}</th>
                <th>{ar ? "المدينة" : "City"}</th>
                <th>{ar ? "الحالة" : "Status"}</th>
                <th>{ar ? "التوثيق" : "Verification"}</th>
                <th>{ar ? "الجودة" : "Quality"}</th>
                <th>{ar ? "آخر نشاط" : "Last active"}</th>
                <th>{ar ? "إجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {data.results.map((user) => (
                <tr key={user.id}>
                  <td>
                    <b>{personName(user)}</b>
                    <br />
                    <small>{user.email ?? "—"}</small>
                  </td>
                  <td>{user.phone}</td>
                  <td>{user.city ?? "—"}</td>
                  <td>
                    <span className="status">
                      {statusLabel(user.accountStatus, language)}
                    </span>
                  </td>
                  <td>{statusLabel(user.verification, language)}</td>
                  <td>{user.profileQuality}%</td>
                  <td>{formatDateTime(user.lastActiveAt, language)}</td>
                  <td>
                    {user.accountStatus === "active" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => changeStatus(user, "suspended")}
                        >
                          {ar ? "تعليق" : "Suspend"}
                        </button>
                        <button
                          type="button"
                          onClick={() => changeStatus(user, "banned")}
                        >
                          {ar ? "حظر" : "Ban"}
                        </button>
                      </>
                    ) : user.accountStatus !== "deleted" ? (
                      <button
                        type="button"
                        onClick={() => changeStatus(user, "active")}
                      >
                        {ar ? "تفعيل" : "Activate"}
                      </button>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <AdminPager
            page={data.page}
            pages={data.pages}
            onPage={setPage}
            language={language}
          />
        </section>
      ) : null}
      {action.dialog}
    </>
  )
}

// ───────────────────────── Verification ─────────────────────────

function AdminVerification({ language }: { language: Language }) {
  const ar = language === "ar"
  const [status, setStatus] = useState("pending")
  const [page, setPage] = useState(1)
  const [data, setData] = useState<{
    results: ApiAdminVerification[]
    total: number
    page: number
    pages: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const action = useAdminAction(language)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(
        await adminApi.verifications({
          status: status || undefined,
          page,
        }),
      )
      setError("")
    } catch (reason) {
      setError(
        errorText(
          reason,
          ar ? "تعذّر تحميل طلبات التوثيق." : "Could not load verifications.",
        ),
      )
    } finally {
      setLoading(false)
    }
  }, [status, page, ar])

  useEffect(() => {
    void load()
  }, [load])

  const review = (
    request: ApiAdminVerification,
    nextStatus: "approved" | "rejected",
  ) => {
    action.open({
      title:
        nextStatus === "approved"
          ? ar
            ? "اعتماد طلب التوثيق"
            : "Approve verification"
          : ar
            ? "رفض طلب التوثيق"
            : "Reject verification",
      description: `${personName(request.user)} · ${request.user.phone}`,
      confirmLabel:
        nextStatus === "approved"
          ? ar
            ? "اعتماد"
            : "Approve"
          : ar
            ? "رفض"
            : "Reject",
      requireReason: nextStatus === "rejected",
      run: (reason) =>
        adminApi.reviewVerification(request.id, nextStatus, reason || undefined),
      onSuccess: () => void load(),
    })
  }

  return (
    <>
      <div className="admin-toolbar">
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value)
            setPage(1)
          }}
        >
          <option value="">{ar ? "كل الطلبات" : "All requests"}</option>
          <option value="pending">{ar ? "قيد الانتظار" : "Pending"}</option>
          <option value="processing">
            {ar ? "قيد المراجعة" : "Processing"}
          </option>
          <option value="approved">{ar ? "مقبول" : "Approved"}</option>
          <option value="rejected">{ar ? "مرفوض" : "Rejected"}</option>
        </select>
        <Button kind="soft" onClick={() => void load()}>
          {ar ? "تحديث" : "Refresh"}
        </Button>
      </div>
      {error && <AdminError message={error} language={language} />}
      {loading ? (
        <AdminLoading language={language} />
      ) : data ? (
        <section className="admin-table table-scroll">
          <div className="block-heading">
            <div>
              <h2>{ar ? "قائمة التحقق" : "Verification queue"}</h2>
              <p>
                {ar
                  ? `${formatNumber(data.total, language)} طلب`
                  : `${formatNumber(data.total, language)} requests`}
              </p>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>{ar ? "المستخدم" : "User"}</th>
                <th>{ar ? "الهاتف" : "Phone"}</th>
                <th>{ar ? "المدينة" : "City"}</th>
                <th>{ar ? "الحالة" : "Status"}</th>
                <th>{ar ? "الخطوات" : "Steps"}</th>
                <th>{ar ? "تاريخ التقديم" : "Submitted"}</th>
                <th>{ar ? "إجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {data.results.map((request) => (
                <tr key={request.id}>
                  <td>
                    <b>{personName(request.user)}</b>
                    <br />
                    <small>{request.user.email ?? "—"}</small>
                  </td>
                  <td>{request.user.phone}</td>
                  <td>{request.user.city ?? "—"}</td>
                  <td>
                    <span className="status">
                      {statusLabel(request.status, language)}
                    </span>
                  </td>
                  <td>{request.steps.length}</td>
                  <td>{formatDateTime(request.submittedAt, language)}</td>
                  <td>
                    {request.status === "pending" ||
                    request.status === "processing" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => review(request, "approved")}
                        >
                          {ar ? "اعتماد" : "Approve"}
                        </button>
                        <button
                          type="button"
                          onClick={() => review(request, "rejected")}
                        >
                          {ar ? "رفض" : "Reject"}
                        </button>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <AdminPager
            page={data.page}
            pages={data.pages}
            onPage={setPage}
            language={language}
          />
        </section>
      ) : null}
      {action.dialog}
    </>
  )
}

// ───────────────────────── Reports ─────────────────────────

function AdminReports({ language }: { language: Language }) {
  const ar = language === "ar"
  const [status, setStatus] = useState("open")
  const [page, setPage] = useState(1)
  const [data, setData] = useState<{
    results: ApiAdminReport[]
    total: number
    page: number
    pages: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const action = useAdminAction(language)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(
        await adminApi.reports({
          status: status || undefined,
          page,
        }),
      )
      setError("")
    } catch (reason) {
      setError(
        errorText(
          reason,
          ar ? "تعذّر تحميل البلاغات." : "Could not load reports.",
        ),
      )
    } finally {
      setLoading(false)
    }
  }, [status, page, ar])

  useEffect(() => {
    void load()
  }, [load])

  const review = (
    report: ApiAdminReport,
    nextStatus: string,
    actionName?: string,
  ) => {
    action.open({
      title:
        nextStatus === "dismissed"
          ? ar
            ? "تجاهل البلاغ"
            : "Dismiss report"
          : ar
            ? "حل البلاغ"
            : "Resolve report",
      description: `${report.reference} · ${report.targetType}`,
      confirmLabel:
        nextStatus === "dismissed"
          ? ar
            ? "تجاهل"
            : "Dismiss"
          : ar
            ? "حل البلاغ"
            : "Resolve",
      requireReason: nextStatus !== "dismissed",
      run: (reason) =>
        adminApi.reviewReport(report.id, {
          status: nextStatus,
          action: actionName,
          reason: reason || undefined,
        }),
      onSuccess: () => void load(),
    })
  }

  const markReviewing = async (report: ApiAdminReport) => {
    try {
      await adminApi.reviewReport(report.id, { status: "reviewing" })
      await load()
    } catch (reason) {
      setError(
        errorText(
          reason,
          ar ? "تعذّر تحديث البلاغ." : "Could not update the report.",
        ),
      )
    }
  }

  return (
    <>
      <div className="admin-toolbar">
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value)
            setPage(1)
          }}
        >
          <option value="">{ar ? "كل البلاغات" : "All reports"}</option>
          <option value="open">{ar ? "مفتوح" : "Open"}</option>
          <option value="reviewing">{ar ? "قيد المراجعة" : "Reviewing"}</option>
          <option value="resolved">{ar ? "محلول" : "Resolved"}</option>
          <option value="dismissed">{ar ? "متجاهل" : "Dismissed"}</option>
        </select>
        <Button kind="soft" onClick={() => void load()}>
          {ar ? "تحديث" : "Refresh"}
        </Button>
      </div>
      {error && <AdminError message={error} language={language} />}
      {loading ? (
        <AdminLoading language={language} />
      ) : data ? (
        <section className="admin-table table-scroll">
          <div className="block-heading">
            <div>
              <h2>{ar ? "البلاغات والمخاطر" : "Reports & risk"}</h2>
              <p>
                {ar
                  ? `${formatNumber(data.total, language)} بلاغ`
                  : `${formatNumber(data.total, language)} reports`}
              </p>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>{ar ? "المرجع" : "Reference"}</th>
                <th>{ar ? "المُبلّغ" : "Reporter"}</th>
                <th>{ar ? "الهدف" : "Target"}</th>
                <th>{ar ? "السبب" : "Reason"}</th>
                <th>{ar ? "الحالة" : "Status"}</th>
                <th>{ar ? "التاريخ" : "Date"}</th>
                <th>{ar ? "إجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {data.results.map((report) => (
                <tr key={report.id}>
                  <td>{report.reference}</td>
                  <td>{personName(report.reporter)}</td>
                  <td>
                    {report.targetType}
                    <br />
                    <small>{report.targetId}</small>
                  </td>
                  <td>{report.reason?.labelAr ?? "—"}</td>
                  <td>
                    <span className="status">
                      {statusLabel(report.status, language)}
                    </span>
                  </td>
                  <td>{formatDateTime(report.createdAt, language)}</td>
                  <td>
                    {report.status === "open" && (
                      <button
                        type="button"
                        onClick={() => void markReviewing(report)}
                      >
                        {ar ? "بدء المراجعة" : "Start review"}
                      </button>
                    )}
                    {report.status === "open" ||
                    report.status === "reviewing" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => review(report, "resolved")}
                        >
                          {ar ? "حل" : "Resolve"}
                        </button>
                        <button
                          type="button"
                          onClick={() => review(report, "dismissed")}
                        >
                          {ar ? "تجاهل" : "Dismiss"}
                        </button>
                        {report.targetType === "user" && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                review(report, "resolved", "suspend")
                              }
                            >
                              {ar ? "تعليق" : "Suspend"}
                            </button>
                            <button
                              type="button"
                              onClick={() => review(report, "resolved", "ban")}
                            >
                              {ar ? "حظر" : "Ban"}
                            </button>
                          </>
                        )}
                        {(report.targetType === "post" ||
                          report.targetType === "comment") && (
                          <button
                            type="button"
                            onClick={() => review(report, "resolved", "remove")}
                          >
                            {ar ? "إزالة المحتوى" : "Remove content"}
                          </button>
                        )}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <AdminPager
            page={data.page}
            pages={data.pages}
            onPage={setPage}
            language={language}
          />
        </section>
      ) : null}
      {action.dialog}
    </>
  )
}

// ───────────────────────── Plans & packages ─────────────────────────

function AdminPlanCard({
  plan,
  language,
  onSaved,
  onError,
}: {
  plan: ApiAdminPlan
  language: Language
  onSaved: () => void
  onError: (message: string) => void
}) {
  const ar = language === "ar"
  const [price, setPrice] = useState(String(plan.priceAmount))
  const [busy, setBusy] = useState(false)
  const save = async (input: Record<string, unknown>) => {
    setBusy(true)
    try {
      await adminApi.updatePlan(plan.id, input)
      onSaved()
    } catch (reason) {
      onError(
        errorText(
          reason,
          ar ? "تعذّر تحديث الباقة." : "Could not update the plan.",
        ),
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <article>
      <div className="manage-card-head">
        <span>
          <Icon name="heart" />
        </span>
        <span className="status">
          {plan.isActive
            ? ar
              ? "نشطة"
              : "Active"
            : ar
              ? "متوقفة"
              : "Inactive"}
        </span>
      </div>
      <h2>{plan.name}</h2>
      <p>
        {plan.durationDays} {ar ? "يوم" : "days"} · {plan.key}
      </p>
      <div className="manage-price">
        {formatNumber(plan.priceAmount, language)} {plan.currency}
      </div>
      <ul>
        {plan.features.slice(0, 5).map((feature) => (
          <li key={feature.featureId}>
            <Icon name="check" size={13} />
            {feature.feature.nameAr}
          </li>
        ))}
      </ul>
      <div className="price-editor">
        <input
          type="number"
          min="0"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          aria-label={ar ? "سعر الباقة" : "Plan price"}
        />
        <Button
          kind="soft"
          disabled={busy}
          onClick={() => void save({ priceAmount: Number(price) })}
        >
          {ar ? "حفظ" : "Save"}
        </Button>
      </div>
      <Button
        kind="outline"
        disabled={busy}
        onClick={() => void save({ isActive: !plan.isActive })}
      >
        {plan.isActive
          ? ar
            ? "إيقاف الباقة"
            : "Deactivate"
          : ar
            ? "تفعيل الباقة"
            : "Activate"}
      </Button>
    </article>
  )
}

function AdminPackageCard({
  pack,
  language,
  onSaved,
  onError,
}: {
  pack: ApiAdminPackage
  language: Language
  onSaved: () => void
  onError: (message: string) => void
}) {
  const ar = language === "ar"
  const [price, setPrice] = useState(String(pack.priceAmount))
  const [credits, setCredits] = useState(String(pack.baseCredits))
  const [busy, setBusy] = useState(false)
  const save = async (input: Record<string, unknown>) => {
    setBusy(true)
    try {
      await adminApi.updatePackage(pack.id, input)
      onSaved()
    } catch (reason) {
      onError(
        errorText(
          reason,
          ar ? "تعذّر تحديث الحزمة." : "Could not update the package.",
        ),
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <article>
      <div className="manage-card-head">
        <span>
          <Icon name="wallet" />
        </span>
        <span className="status">
          {pack.isActive
            ? ar
              ? "نشطة"
              : "Active"
            : ar
              ? "متوقفة"
              : "Inactive"}
        </span>
      </div>
      <h2>{pack.name}</h2>
      <p>
        {pack.baseCredits + pack.bonusCredits} {ar ? "رصيد" : "credits"} ·{" "}
        {pack.key}
      </p>
      <div className="manage-price">
        {formatNumber(pack.priceAmount, language)} {pack.currency}
      </div>
      <div className="price-editor">
        <input
          type="number"
          min="0"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          aria-label={ar ? "السعر" : "Price"}
        />
        <input
          type="number"
          min="0"
          value={credits}
          onChange={(event) => setCredits(event.target.value)}
          aria-label={ar ? "الرصيد" : "Credits"}
        />
      </div>
      <div className="price-editor">
        <Button
          kind="soft"
          disabled={busy}
          onClick={() =>
            void save({
              priceAmount: Number(price),
              baseCredits: Number(credits),
            })
          }
        >
          {ar ? "حفظ السعر والرصيد" : "Save price & credits"}
        </Button>
      </div>
      <Button
        kind="outline"
        disabled={busy}
        onClick={() => void save({ isActive: !pack.isActive })}
      >
        {pack.isActive
          ? ar
            ? "إيقاف الحزمة"
            : "Deactivate"
          : ar
            ? "تفعيل الحزمة"
            : "Activate"}
      </Button>
    </article>
  )
}

function AdminPlans({ language }: { language: Language }) {
  const ar = language === "ar"
  const [plans, setPlans] = useState<ApiAdminPlan[]>([])
  const [packages, setPackages] = useState<ApiAdminPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [planData, packageData] = await Promise.all([
        adminApi.plans(),
        adminApi.packages(),
      ])
      setPlans(planData.plans)
      setPackages(packageData.packages)
      setError("")
    } catch (reason) {
      setError(
        errorText(
          reason,
          ar ? "تعذّر تحميل الباقات." : "Could not load plans.",
        ),
      )
    } finally {
      setLoading(false)
    }
  }, [ar])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) return <AdminLoading language={language} />
  if (error) return <AdminError message={error} language={language} />

  return (
    <>
      <section className="editorial-stats">
        <article>
          <b>{plans.length}</b>
          <span>{ar ? "باقة اشتراك" : "Subscription plans"}</span>
        </article>
        <article>
          <b>{packages.length}</b>
          <span>{ar ? "حزمة رصيد" : "Credit packages"}</span>
        </article>
        <article>
          <b>{plans.filter((plan) => plan.isActive).length}</b>
          <span>{ar ? "باقة نشطة" : "Active plans"}</span>
        </article>
        <article>
          <b>{packages.filter((pack) => pack.isActive).length}</b>
          <span>{ar ? "حزمة نشطة" : "Active packages"}</span>
        </article>
      </section>
      <div className="block-heading">
        <div>
          <h2>{ar ? "باقات الاشتراك" : "Subscription plans"}</h2>
          <p>
            {ar
              ? "تعديل السعر والتفعيل يُسجّل في سجل التدقيق."
              : "Price changes and activation are audit-logged."}
          </p>
        </div>
      </div>
      <div className="manage-card-grid">
        {plans.map((plan) => (
          <AdminPlanCard
            key={plan.id}
            plan={plan}
            language={language}
            onSaved={() => void load()}
            onError={setError}
          />
        ))}
      </div>
      <div className="block-heading" style={{ marginTop: 24 }}>
        <div>
          <h2>{ar ? "حزم الرصيد" : "Credit packages"}</h2>
          <p>
            {ar
              ? "تعديل الرصيد والسعر المتاح للشراء."
              : "Edit the credits and price available for purchase."}
          </p>
        </div>
      </div>
      <div className="manage-card-grid">
        {packages.map((pack) => (
          <AdminPackageCard
            key={pack.id}
            pack={pack}
            language={language}
            onSaved={() => void load()}
            onError={setError}
          />
        ))}
      </div>
      {error && <AdminError message={error} language={language} />}
    </>
  )
}

// ───────────────────────── Payments & subscriptions ─────────────────────────

function AdminPayments({ language }: { language: Language }) {
  const ar = language === "ar"
  const [status, setStatus] = useState("")
  const [page, setPage] = useState(1)
  const [data, setData] = useState<{
    results: ApiAdminPayment[]
    total: number
    page: number
    pages: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const action = useAdminAction(language)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(
        await adminApi.payments({
          status: status || undefined,
          page,
        }),
      )
      setError("")
    } catch (reason) {
      setError(
        errorText(
          reason,
          ar ? "تعذّر تحميل المدفوعات." : "Could not load payments.",
        ),
      )
    } finally {
      setLoading(false)
    }
  }, [status, page, ar])

  useEffect(() => {
    void load()
  }, [load])

  const markPaid = (payment: ApiAdminPayment) => {
    action.open({
      title: ar ? "تأكيد استلام الدفعة" : "Confirm payment received",
      description: `${payment.reference} · ${formatNumber(
        payment.amount,
        language,
      )} ${payment.currency}`,
      confirmLabel: ar ? "تأكيد الدفع" : "Confirm payment",
      run: (note) => adminApi.markPaymentPaid(payment.id, note || undefined),
      onSuccess: () => void load(),
    })
  }

  return (
    <>
      <div className="admin-toolbar">
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value)
            setPage(1)
          }}
        >
          <option value="">{ar ? "كل المدفوعات" : "All payments"}</option>
          <option value="pending">{ar ? "معلّقة" : "Pending"}</option>
          <option value="succeeded">{ar ? "ناجحة" : "Succeeded"}</option>
          <option value="failed">{ar ? "فاشلة" : "Failed"}</option>
        </select>
        <Button kind="soft" onClick={() => void load()}>
          {ar ? "تحديث" : "Refresh"}
        </Button>
      </div>
      {error && <AdminError message={error} language={language} />}
      {loading ? (
        <AdminLoading language={language} />
      ) : data ? (
        <section className="admin-table table-scroll">
          <div className="block-heading">
            <div>
              <h2>{ar ? "المدفوعات" : "Payments"}</h2>
              <p>
                {ar
                  ? `${formatNumber(data.total, language)} عملية`
                  : `${formatNumber(data.total, language)} transactions`}
              </p>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>{ar ? "المرجع" : "Reference"}</th>
                <th>{ar ? "المستخدم" : "User"}</th>
                <th>{ar ? "الغرض" : "Purpose"}</th>
                <th>{ar ? "المبلغ" : "Amount"}</th>
                <th>{ar ? "المزود" : "Provider"}</th>
                <th>{ar ? "الحالة" : "Status"}</th>
                <th>{ar ? "التاريخ" : "Date"}</th>
                <th>{ar ? "إجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {data.results.map((payment) => (
                <tr key={payment.id}>
                  <td>{payment.reference}</td>
                  <td>{personName(payment.user)}</td>
                  <td>{payment.purpose}</td>
                  <td>
                    {formatNumber(payment.amount, language)} {payment.currency}
                  </td>
                  <td>{payment.provider}</td>
                  <td>
                    <span className="status">
                      {statusLabel(payment.status, language)}
                    </span>
                  </td>
                  <td>{formatDateTime(payment.createdAt, language)}</td>
                  <td>
                    {payment.status === "pending" ? (
                      <button type="button" onClick={() => markPaid(payment)}>
                        {ar ? "تأكيد الدفع" : "Mark paid"}
                      </button>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <AdminPager
            page={data.page}
            pages={data.pages}
            onPage={setPage}
            language={language}
          />
        </section>
      ) : null}
      {action.dialog}
    </>
  )
}

function AdminSubscriptions({ language }: { language: Language }) {
  const ar = language === "ar"
  const [page, setPage] = useState(1)
  const [data, setData] = useState<{
    results: ApiAdminSubscription[]
    total: number
    page: number
    pages: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await adminApi.subscriptions({ page }))
      setError("")
    } catch (reason) {
      setError(
        errorText(
          reason,
          ar ? "تعذّر تحميل الاشتراكات." : "Could not load subscriptions.",
        ),
      )
    } finally {
      setLoading(false)
    }
  }, [page, ar])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) return <AdminLoading language={language} />
  if (!data) return <AdminError message={error} language={language} />

  return (
    <section className="admin-table table-scroll">
      <div className="block-heading">
        <div>
          <h2>{ar ? "الاشتراكات" : "Subscriptions"}</h2>
          <p>
            {ar
              ? `${formatNumber(data.total, language)} اشتراك`
              : `${formatNumber(data.total, language)} subscriptions`}
          </p>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>{ar ? "المستخدم" : "User"}</th>
            <th>{ar ? "الباقة" : "Plan"}</th>
            <th>{ar ? "الحالة" : "Status"}</th>
            <th>{ar ? "البداية" : "Started"}</th>
            <th>{ar ? "النهاية" : "Expires"}</th>
            <th>{ar ? "تجديد تلقائي" : "Auto renew"}</th>
          </tr>
        </thead>
        <tbody>
          {data.results.map((subscription) => (
            <tr key={subscription.id}>
              <td>{personName(subscription.user)}</td>
              <td>{subscription.plan.name}</td>
              <td>
                <span className="status">
                  {statusLabel(subscription.status, language)}
                </span>
              </td>
              <td>{formatDate(subscription.startedAt, language)}</td>
              <td>{formatDate(subscription.expiresAt, language)}</td>
              <td>{subscription.autoRenew ? (ar ? "نعم" : "Yes") : ar ? "لا" : "No"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <AdminPager
        page={data.page}
        pages={data.pages}
        onPage={setPage}
        language={language}
      />
    </section>
  )
}

// ───────────────────────── Content ─────────────────────────

function AdminArticles({ language }: { language: Language }) {
  const ar = language === "ar"
  const [status, setStatus] = useState("")
  const [page, setPage] = useState(1)
  const [data, setData] = useState<{
    results: ApiAdminArticle[]
    total: number
    page: number
    pages: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: "",
    slug: "",
    excerpt: "",
    body: "",
    coverUrl: "",
    status: "draft",
    isFeatured: false,
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(
        await adminApi.articles({
          status: status || undefined,
          page,
        }),
      )
      setError("")
    } catch (reason) {
      setError(
        errorText(
          reason,
          ar ? "تعذّر تحميل المقالات." : "Could not load articles.",
        ),
      )
    } finally {
      setLoading(false)
    }
  }, [status, page, ar])

  useEffect(() => {
    void load()
  }, [load])

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError("")
    try {
      await adminApi.createArticle({
        title: form.title.trim(),
        slug: form.slug.trim(),
        excerpt: form.excerpt.trim() || undefined,
        body: form.body.trim(),
        coverUrl: form.coverUrl.trim() || undefined,
        status: form.status,
        isFeatured: form.isFeatured,
      })
      setForm({
        title: "",
        slug: "",
        excerpt: "",
        body: "",
        coverUrl: "",
        status: "draft",
        isFeatured: false,
      })
      setShowForm(false)
      await load()
    } catch (reason) {
      setError(
        errorText(
          reason,
          ar ? "تعذّر إنشاء المقال." : "Could not create the article.",
        ),
      )
    } finally {
      setSaving(false)
    }
  }

  const setArticleStatus = async (
    article: ApiAdminArticle,
    nextStatus: string,
  ) => {
    try {
      await adminApi.updateArticle(article.id, { status: nextStatus })
      await load()
    } catch (reason) {
      setError(
        errorText(
          reason,
          ar ? "تعذّر تحديث المقال." : "Could not update the article.",
        ),
      )
    }
  }

  return (
    <>
      <div className="admin-toolbar">
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value)
            setPage(1)
          }}
        >
          <option value="">{ar ? "كل المقالات" : "All articles"}</option>
          <option value="draft">{ar ? "مسودة" : "Draft"}</option>
          <option value="published">{ar ? "منشور" : "Published"}</option>
          <option value="scheduled">{ar ? "مجدول" : "Scheduled"}</option>
        </select>
        <Button kind="soft" onClick={() => setShowForm(!showForm)}>
          {showForm
            ? ar
              ? "إغلاق النموذج"
              : "Close form"
            : ar
              ? "مقال جديد"
              : "New article"}
        </Button>
        <Button kind="outline" onClick={() => void load()}>
          {ar ? "تحديث" : "Refresh"}
        </Button>
      </div>
      {showForm && (
        <form className="settings-card" onSubmit={submit}>
          <div className="settings-heading">
            <h2>{ar ? "مقال جديد" : "New article"}</h2>
            <p>
              {ar
                ? "يُنشر المقال بعد اختيار الحالة المنشورة."
                : "The article is published when the published status is selected."}
            </p>
          </div>
          <div className="form-grid">
            <label>
              {ar ? "العنوان" : "Title"}
              <input
                required
                value={form.title}
                onChange={(event) =>
                  setForm({ ...form, title: event.target.value })
                }
              />
            </label>
            <label>
              {ar ? "الرابط (slug)" : "Slug"}
              <input
                required
                pattern="[a-z0-9-]+"
                value={form.slug}
                onChange={(event) =>
                  setForm({ ...form, slug: event.target.value })
                }
                placeholder="article-slug"
              />
            </label>
            <label className="wide">
              {ar ? "الملخص" : "Excerpt"}
              <input
                value={form.excerpt}
                onChange={(event) =>
                  setForm({ ...form, excerpt: event.target.value })
                }
              />
            </label>
            <label className="wide">
              {ar ? "المحتوى" : "Body"}
              <textarea
                required
                value={form.body}
                onChange={(event) =>
                  setForm({ ...form, body: event.target.value })
                }
              />
            </label>
            <label>
              {ar ? "رابط صورة الغلاف" : "Cover URL"}
              <input
                type="url"
                value={form.coverUrl}
                onChange={(event) =>
                  setForm({ ...form, coverUrl: event.target.value })
                }
                placeholder="https://…"
              />
            </label>
            <label>
              {ar ? "الحالة" : "Status"}
              <select
                value={form.status}
                onChange={(event) =>
                  setForm({ ...form, status: event.target.value })
                }
              >
                <option value="draft">{ar ? "مسودة" : "Draft"}</option>
                <option value="published">{ar ? "منشور" : "Published"}</option>
                <option value="scheduled">{ar ? "مجدول" : "Scheduled"}</option>
              </select>
            </label>
            <label className="filter-check wide">
              <input
                type="checkbox"
                checked={form.isFeatured}
                onChange={(event) =>
                  setForm({ ...form, isFeatured: event.target.checked })
                }
              />{" "}
              {ar ? "مقال مميز" : "Featured article"}
            </label>
          </div>
          <Button type="submit" disabled={saving}>
            {saving
              ? ar
                ? "جارٍ الحفظ…"
                : "Saving…"
              : ar
                ? "حفظ المقال"
                : "Save article"}
          </Button>
        </form>
      )}
      {error && <AdminError message={error} language={language} />}
      {loading ? (
        <AdminLoading language={language} />
      ) : data ? (
        <section className="admin-table table-scroll">
          <div className="block-heading">
            <div>
              <h2>{ar ? "إدارة المدونة" : "Blog CMS"}</h2>
              <p>
                {ar
                  ? `${formatNumber(data.total, language)} مقال`
                  : `${formatNumber(data.total, language)} articles`}
              </p>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>{ar ? "العنوان" : "Title"}</th>
                <th>{ar ? "التصنيف" : "Category"}</th>
                <th>{ar ? "الحالة" : "Status"}</th>
                <th>{ar ? "المشاهدات" : "Views"}</th>
                <th>{ar ? "التاريخ" : "Date"}</th>
                <th>{ar ? "إجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {data.results.map((article) => (
                <tr key={article.id}>
                  <td>
                    <b>{article.title}</b>
                    <br />
                    <small>{article.slug}</small>
                  </td>
                  <td>{article.category?.nameAr ?? "—"}</td>
                  <td>
                    <span className="status">
                      {statusLabel(article.status, language)}
                    </span>
                  </td>
                  <td>{formatNumber(article.views, language)}</td>
                  <td>{formatDate(article.publishedAt ?? article.createdAt, language)}</td>
                  <td>
                    {article.status !== "published" && (
                      <button
                        type="button"
                        onClick={() => void setArticleStatus(article, "published")}
                      >
                        {ar ? "نشر" : "Publish"}
                      </button>
                    )}
                    {article.status === "published" && (
                      <button
                        type="button"
                        onClick={() => void setArticleStatus(article, "draft")}
                      >
                        {ar ? "إلى المسودة" : "Unpublish"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <AdminPager
            page={data.page}
            pages={data.pages}
            onPage={setPage}
            language={language}
          />
        </section>
      ) : null}
    </>
  )
}

function AdminPosts({ language }: { language: Language }) {
  const ar = language === "ar"
  const [status, setStatus] = useState("")
  const [page, setPage] = useState(1)
  const [data, setData] = useState<{
    results: ApiAdminPost[]
    total: number
    page: number
    pages: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(
        await adminApi.posts({
          status: status || undefined,
          page,
        }),
      )
      setError("")
    } catch (reason) {
      setError(
        errorText(
          reason,
          ar ? "تعذّر تحميل المنشورات." : "Could not load posts.",
        ),
      )
    } finally {
      setLoading(false)
    }
  }, [status, page, ar])

  useEffect(() => {
    void load()
  }, [load])

  const moderate = async (post: ApiAdminPost, nextStatus: string) => {
    try {
      await adminApi.moderatePost(post.id, nextStatus)
      await load()
    } catch (reason) {
      setError(
        errorText(
          reason,
          ar ? "تعذّر تحديث المنشور." : "Could not update the post.",
        ),
      )
    }
  }

  return (
    <>
      <div className="admin-toolbar">
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value)
            setPage(1)
          }}
        >
          <option value="">{ar ? "كل المنشورات" : "All posts"}</option>
          <option value="published">{ar ? "منشور" : "Published"}</option>
          <option value="pending_review">
            {ar ? "بانتظار المراجعة" : "Pending review"}
          </option>
          <option value="draft">{ar ? "مسودة" : "Draft"}</option>
          <option value="removed">{ar ? "محذوف" : "Removed"}</option>
        </select>
        <Button kind="soft" onClick={() => void load()}>
          {ar ? "تحديث" : "Refresh"}
        </Button>
      </div>
      {error && <AdminError message={error} language={language} />}
      {loading ? (
        <AdminLoading language={language} />
      ) : data ? (
        <section className="admin-table table-scroll">
          <div className="block-heading">
            <div>
              <h2>{ar ? "منشورات المجتمع" : "Community posts"}</h2>
              <p>
                {ar
                  ? `${formatNumber(data.total, language)} منشور`
                  : `${formatNumber(data.total, language)} posts`}
              </p>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>{ar ? "الكاتب" : "Author"}</th>
                <th>{ar ? "الموضوع" : "Topic"}</th>
                <th>{ar ? "المحتوى" : "Body"}</th>
                <th>{ar ? "التفاعل" : "Engagement"}</th>
                <th>{ar ? "الحالة" : "Status"}</th>
                <th>{ar ? "التاريخ" : "Date"}</th>
                <th>{ar ? "إجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {data.results.map((post) => (
                <tr key={post.id}>
                  <td>{personName(post.author)}</td>
                  <td>{post.topic?.nameAr ?? "—"}</td>
                  <td>
                    {post.body.length > 80
                      ? `${post.body.slice(0, 80)}…`
                      : post.body}
                  </td>
                  <td>
                    {post.likeCount} / {post.commentCount}
                  </td>
                  <td>
                    <span className="status">
                      {statusLabel(post.status, language)}
                    </span>
                  </td>
                  <td>{formatDateTime(post.createdAt, language)}</td>
                  <td>
                    {post.status !== "published" && (
                      <button
                        type="button"
                        onClick={() => void moderate(post, "published")}
                      >
                        {ar ? "نشر" : "Publish"}
                      </button>
                    )}
                    {post.status !== "removed" && (
                      <button
                        type="button"
                        onClick={() => void moderate(post, "removed")}
                      >
                        {ar ? "إزالة" : "Remove"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <AdminPager
            page={data.page}
            pages={data.pages}
            onPage={setPage}
            language={language}
          />
        </section>
      ) : null}
    </>
  )
}

function AdminTopics({ language }: { language: Language }) {
  const ar = language === "ar"
  const [topics, setTopics] = useState<ApiAdminTopic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ key: "", nameAr: "", icon: "" })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await adminApi.topics()
      setTopics(data.topics)
      setError("")
    } catch (reason) {
      setError(
        errorText(
          reason,
          ar ? "تعذّر تحميل المواضيع." : "Could not load topics.",
        ),
      )
    } finally {
      setLoading(false)
    }
  }, [ar])

  useEffect(() => {
    void load()
  }, [load])

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError("")
    try {
      await adminApi.createTopic({
        key: form.key.trim(),
        nameAr: form.nameAr.trim(),
        icon: form.icon.trim() || undefined,
      })
      setForm({ key: "", nameAr: "", icon: "" })
      await load()
    } catch (reason) {
      setError(
        errorText(
          reason,
          ar ? "تعذّر إنشاء الموضوع." : "Could not create the topic.",
        ),
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <AdminLoading language={language} />

  return (
    <>
      <form className="settings-card" onSubmit={submit}>
        <div className="settings-heading">
          <h2>{ar ? "موضوع مجتمعي جديد" : "New community topic"}</h2>
          <p>
            {ar
              ? "المفتاح بحروف إنجليزية صغيرة وأرقام وشرطات سفلية."
              : "The key uses lowercase letters, numbers and underscores."}
          </p>
        </div>
        <div className="form-grid">
          <label>
            {ar ? "المفتاح" : "Key"}
            <input
              required
              pattern="[a-z0-9_]+"
              value={form.key}
              onChange={(event) =>
                setForm({ ...form, key: event.target.value })
              }
              placeholder="family_values"
            />
          </label>
          <label>
            {ar ? "الاسم العربي" : "Arabic name"}
            <input
              required
              value={form.nameAr}
              onChange={(event) =>
                setForm({ ...form, nameAr: event.target.value })
              }
            />
          </label>
          <label>
            {ar ? "الأيقونة" : "Icon"}
            <input
              value={form.icon}
              onChange={(event) =>
                setForm({ ...form, icon: event.target.value })
              }
              placeholder="heart"
            />
          </label>
        </div>
        <Button type="submit" disabled={saving}>
          {saving
            ? ar
              ? "جارٍ الحفظ…"
              : "Saving…"
            : ar
              ? "إنشاء الموضوع"
              : "Create topic"}
        </Button>
      </form>
      {error && <AdminError message={error} language={language} />}
      <section className="admin-table table-scroll">
        <div className="block-heading">
          <div>
            <h2>{ar ? "مواضيع المجتمع" : "Community topics"}</h2>
            <p>
              {ar
                ? `${formatNumber(topics.length, language)} موضوع`
                : `${formatNumber(topics.length, language)} topics`}
            </p>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>{ar ? "المفتاح" : "Key"}</th>
              <th>{ar ? "الاسم" : "Name"}</th>
              <th>{ar ? "الأيقونة" : "Icon"}</th>
              <th>{ar ? "قابل للمتابعة" : "Followable"}</th>
              <th>{ar ? "موسمي" : "Seasonal"}</th>
              <th>{ar ? "نشط" : "Active"}</th>
              <th>{ar ? "الترتيب" : "Order"}</th>
            </tr>
          </thead>
          <tbody>
            {topics.map((topic) => (
              <tr key={topic.id}>
                <td>{topic.key}</td>
                <td>{topic.nameAr}</td>
                <td>{topic.icon ?? "—"}</td>
                <td>{topic.isFollowable ? (ar ? "نعم" : "Yes") : ar ? "لا" : "No"}</td>
                <td>{topic.isSeasonal ? (ar ? "نعم" : "Yes") : ar ? "لا" : "No"}</td>
                <td>{topic.isActive ? (ar ? "نعم" : "Yes") : ar ? "لا" : "No"}</td>
                <td>{topic.sortOrder}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  )
}

function AdminContent({ language }: { language: Language }) {
  const ar = language === "ar"
  const [tab, setTab] = useState<"articles" | "posts" | "topics">("articles")
  return (
    <>
      <div className="tabs compact">
        <button
          className={tab === "articles" ? "active" : ""}
          onClick={() => setTab("articles")}
        >
          {ar ? "المدونة" : "Blog"}
        </button>
        <button
          className={tab === "posts" ? "active" : ""}
          onClick={() => setTab("posts")}
        >
          {ar ? "منشورات المجتمع" : "Community posts"}
        </button>
        <button
          className={tab === "topics" ? "active" : ""}
          onClick={() => setTab("topics")}
        >
          {ar ? "المواضيع" : "Topics"}
        </button>
      </div>
      {tab === "articles" && <AdminArticles language={language} />}
      {tab === "posts" && <AdminPosts language={language} />}
      {tab === "topics" && <AdminTopics language={language} />}
    </>
  )
}

// ───────────────────────── Access & roles ─────────────────────────

function AdminAccess({
  language,
  currentAdminId,
}: {
  language: Language
  currentAdminId?: string
}) {
  const ar = language === "ar"
  const [admins, setAdmins] = useState<ApiAdminRow[]>([])
  const [roles, setRoles] = useState<ApiAdminRoleFull[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [rolesError, setRolesError] = useState("")
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    roleKey: "",
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await adminApi.admins()
      setAdmins(data.admins)
      setError("")
    } catch (reason) {
      setError(
        errorText(
          reason,
          ar ? "تعذّر تحميل المشرفين." : "Could not load admins.",
        ),
      )
    } finally {
      setLoading(false)
    }
    try {
      const data = await adminApi.roles()
      setRoles(data.roles)
      setRolesError("")
    } catch (reason) {
      setRolesError(
        errorText(
          reason,
          ar
            ? "لا تملك صلاحية عرض الأدوار."
            : "You do not have permission to view roles.",
        ),
      )
    }
  }, [ar])

  useEffect(() => {
    void load()
  }, [load])

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError("")
    try {
      await adminApi.createAdmin({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        password: form.password,
        roleKey: form.roleKey,
      })
      setForm({ name: "", email: "", phone: "", password: "", roleKey: "" })
      await load()
    } catch (reason) {
      setError(
        errorText(
          reason,
          ar ? "تعذّر إنشاء المشرف." : "Could not create the admin.",
        ),
      )
    } finally {
      setSaving(false)
    }
  }

  const updateAdmin = async (id: string, input: Record<string, unknown>) => {
    setError("")
    try {
      await adminApi.updateAdmin(id, input)
      await load()
    } catch (reason) {
      setError(
        errorText(
          reason,
          ar ? "تعذّر تحديث المشرف." : "Could not update the admin.",
        ),
      )
    }
  }

  const resetTwoFactor = async (id: string) => {
    setError("")
    try {
      await adminApi.resetAdminTwoFactor(id)
      await load()
    } catch (reason) {
      setError(
        errorText(
          reason,
          ar
            ? "تعذّر إعادة ضبط التحقق بخطوتين."
            : "Could not reset two-step verification.",
        ),
      )
    }
  }

  if (loading) return <AdminLoading language={language} />

  return (
    <>
      <form className="settings-card" onSubmit={submit}>
        <div className="settings-heading">
          <h2>{ar ? "إضافة مشرف" : "Add admin"}</h2>
          <p>
            {ar
              ? "كلمة المرور تُشفّر ولا تظهر بعد الإنشاء."
              : "The password is hashed and never shown after creation."}
          </p>
        </div>
        <div className="form-grid">
          <label>
            {ar ? "الاسم" : "Name"}
            <input
              required
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
            />
          </label>
          <label>
            {ar ? "البريد الإلكتروني" : "Email"}
            <input
              required
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm({ ...form, email: event.target.value })
              }
            />
          </label>
          <label>
            {ar ? "الهاتف" : "Phone"}
            <input
              value={form.phone}
              onChange={(event) =>
                setForm({ ...form, phone: event.target.value })
              }
            />
          </label>
          <label>
            {ar ? "كلمة المرور" : "Password"}
            <input
              required
              type="password"
              minLength={8}
              value={form.password}
              onChange={(event) =>
                setForm({ ...form, password: event.target.value })
              }
            />
          </label>
          <label>
            {ar ? "الدور" : "Role"}
            <select
              required
              value={form.roleKey}
              onChange={(event) =>
                setForm({ ...form, roleKey: event.target.value })
              }
            >
              <option value="">{ar ? "اختر الدور" : "Select role"}</option>
              {roles.map((role) => (
                <option value={role.key} key={role.id}>
                  {role.nameAr}
                </option>
              ))}
            </select>
          </label>
        </div>
        <Button type="submit" disabled={saving || roles.length === 0}>
          {saving
            ? ar
              ? "جارٍ الإنشاء…"
              : "Creating…"
            : ar
              ? "إنشاء الحساب"
              : "Create account"}
        </Button>
      </form>
      {error && <AdminError message={error} language={language} />}
      {rolesError && <AdminError message={rolesError} language={language} />}
      <section className="admin-table table-scroll">
        <div className="block-heading">
          <div>
            <h2>{ar ? "المشرفون والصلاحيات" : "Admins & RBAC"}</h2>
            <p>
              {ar
                ? `${formatNumber(admins.length, language)} حساب إداري`
                : `${formatNumber(admins.length, language)} admin accounts`}
            </p>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>{ar ? "الاسم" : "Name"}</th>
              <th>{ar ? "البريد" : "Email"}</th>
              <th>{ar ? "الحالة" : "Status"}</th>
              <th>{ar ? "الدور" : "Role"}</th>
              <th>{ar ? "التحقق بخطوتين" : "2FA"}</th>
              <th>{ar ? "آخر دخول" : "Last login"}</th>
              <th>{ar ? "إجراءات" : "Actions"}</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((admin) => (
              <tr key={admin.id}>
                <td>{admin.name}</td>
                <td>{admin.email}</td>
                <td>
                  <span className="status">
                    {statusLabel(admin.status, language)}
                  </span>
                </td>
                <td>
                  {roles.length > 0 ? (
                    <select
                      value={admin.roles[0]?.role.key ?? ""}
                      onChange={(event) =>
                        void updateAdmin(admin.id, {
                          roleKey: event.target.value,
                        })
                      }
                    >
                      {roles.map((role) => (
                        <option value={role.key} key={role.id}>
                          {role.nameAr}
                        </option>
                      ))}
                    </select>
                  ) : (
                    admin.roles.map((entry) => entry.role.nameAr).join(", ") || "—"
                  )}
                </td>
                <td>
                  <span className="status">
                    {admin.twoFactorEnabled
                      ? ar
                        ? "مفعّل"
                        : "On"
                      : ar
                        ? "غير مفعّل"
                        : "Off"}
                  </span>
                </td>
                <td>{formatDateTime(admin.lastLoginAt, language)}</td>
                <td>
                  <button
                    type="button"
                    onClick={() =>
                      void updateAdmin(admin.id, {
                        status:
                          admin.status === "active" ? "suspended" : "active",
                      })
                    }
                  >
                    {admin.status === "active"
                      ? ar
                        ? "تعليق"
                        : "Suspend"
                      : ar
                        ? "تفعيل"
                        : "Activate"}
                  </button>
                  {admin.id !== currentAdminId && admin.twoFactorEnabled && (
                    <button
                      type="button"
                      className="danger-action"
                      onClick={() => void resetTwoFactor(admin.id)}
                    >
                      {ar ? "إعادة ضبط 2FA" : "Reset 2FA"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {roles.length > 0 && (
        <section className="admin-table">
          <div className="block-heading">
            <h2>{ar ? "الأدوار والصلاحيات" : "Roles & permissions"}</h2>
          </div>
          {roles.map((role) => (
            <div className="audit-item" key={role.id}>
              <span>
                <Icon name="shield" size={16} />
              </span>
              <div>
                <b>{role.nameAr}</b>
                <small>
                  {role.rolePermissions.length}{" "}
                  {ar ? "صلاحية" : "permissions"} · {role.key}
                </small>
              </div>
            </div>
          ))}
        </section>
      )}
    </>
  )
}

// ───────────────────────── Analytics ─────────────────────────

function AdminAnalytics({ language }: { language: Language }) {
  const ar = language === "ar"
  const [data, setData] = useState<ApiAdminAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      try {
        const result = await adminApi.analytics()
        if (!cancelled) {
          setData(result)
          setError("")
        }
      } catch (reason) {
        if (!cancelled)
          setError(
            errorText(
              reason,
              ar ? "تعذّر تحميل التحليلات." : "Could not load analytics.",
            ),
          )
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [ar])

  if (loading) return <AdminLoading language={language} />
  if (!data) return <AdminError message={error} language={language} />

  const sum = (rows: Array<{ count?: number; amount?: number }>) =>
    rows.reduce((total, row) => total + (row.count ?? row.amount ?? 0), 0)
  const signups = data.signups.slice(-14)
  const maxSignup = Math.max(1, ...signups.map((entry) => entry.count))
  const maxFunnel = Math.max(
    1,
    ...data.verificationFunnel.map((entry) => entry.count),
  )

  return (
    <>
      <section className="analytics-hero">
        <div>
          <span>{ar ? "نشاط آخر 30 يومًا" : "Activity in the last 30 days"}</span>
          <b>{formatNumber(sum(data.matches), language)}</b>
          <p>
            {ar
              ? "تطابق نشط، مع تسجيلات ورسائل وإيرادات مباشرة من قاعدة البيانات."
              : "Active matches, with signups, messages and revenue live from the database."}
          </p>
        </div>
        <div className="analytics-ring">
          <b>{formatNumber(data.verificationFunnel.length, language)}</b>
          <small>{ar ? "حالات توثيق" : "verification states"}</small>
        </div>
      </section>
      <div className="analytics-grid">
        <article>
          <Icon name="user" />
          <span>{ar ? "تسجيلات" : "Signups"}</span>
          <b>{formatNumber(sum(data.signups), language)}</b>
          <div>
            <i />
          </div>
        </article>
        <article>
          <Icon name="heart" />
          <span>{ar ? "تطابقات" : "Matches"}</span>
          <b>{formatNumber(sum(data.matches), language)}</b>
          <div>
            <i />
          </div>
        </article>
        <article>
          <Icon name="chat" />
          <span>{ar ? "رسائل" : "Messages"}</span>
          <b>{formatNumber(sum(data.messages), language)}</b>
          <div>
            <i />
          </div>
        </article>
        <article>
          <Icon name="wallet" />
          <span>{ar ? "إيرادات" : "Revenue"}</span>
          <b>{formatNumber(sum(data.revenue), language)}</b>
          <div>
            <i />
          </div>
        </article>
      </div>
      <div className="admin-grid">
        <section className="chart-card">
          <div className="block-heading">
            <div>
              <h2>{ar ? "التسجيلات اليومية" : "Daily signups"}</h2>
              <p>{ar ? "آخر 14 يومًا" : "Last 14 days"}</p>
            </div>
          </div>
          <div className="bars">
            {signups.map((entry) => (
              <div key={entry.day}>
                <i
                  style={{
                    height: `${Math.max(5, (entry.count / maxSignup) * 100)}%`,
                  }}
                />
                <span>{entry.day.slice(5)}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="admin-table">
          <div className="block-heading">
            <h2>{ar ? "قمع التوثيق" : "Verification funnel"}</h2>
          </div>
          {data.verificationFunnel.map((entry) => (
            <div className="funnel-row" key={entry.status}>
              <span>{statusLabel(entry.status, language)}</span>
              <div>
                <i
                  style={{
                    width: `${Math.max(4, (entry.count / maxFunnel) * 100)}%`,
                  }}
                />
              </div>
              <b>{formatNumber(entry.count, language)}</b>
            </div>
          ))}
        </section>
      </div>
      <section className="admin-table">
        <div className="block-heading">
          <h2>{ar ? "أكثر الاهتمامات" : "Top interests"}</h2>
        </div>
        {data.topInterests.map((entry) => (
          <div className="funnel-row" key={entry.name}>
            <span>{entry.name}</span>
            <div>
              <i
                style={{
                  width: `${Math.max(
                    4,
                    (entry.count / Math.max(1, data.topInterests[0]?.count ?? 1)) *
                      100,
                  )}%`,
                }}
              />
            </div>
            <b>{formatNumber(entry.count, language)}</b>
          </div>
        ))}
        {data.topInterests.length === 0 && (
          <div className="empty-state">
            {ar ? "لا توجد اهتمامات مسجلة." : "No interests recorded."}
          </div>
        )}
      </section>
    </>
  )
}

// ───────────────────────── Broadcast ─────────────────────────

function AdminBroadcast({ language }: { language: Language }) {
  const ar = language === "ar"
  const [form, setForm] = useState({
    title: "",
    message: "",
    audience: "active",
    channel: "push",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError("")
    setNotice("")
    try {
      const result = await adminApi.broadcast({
        title: form.title.trim(),
        message: form.message.trim(),
        audience: form.audience as "all" | "active" | "verified",
        channel: form.channel as "push" | "email" | "both",
      })
      setNotice(
        ar
          ? `تم إرسال الإشعار إلى ${result.sent} مستخدمًا.`
          : `The notification was sent to ${result.sent} users.`,
      )
      setForm({ ...form, title: "", message: "" })
    } catch (reason) {
      setError(
        errorText(
          reason,
          ar ? "تعذّر إرسال الإشعار." : "Could not send the notification.",
        ),
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="settings-card" onSubmit={submit}>
      <div className="settings-heading">
        <h2>{ar ? "مركز الإشعارات" : "Notification center"}</h2>
        <p>
          {ar
            ? "إرسال إشعار جماعي للمستخدمين. يُسجّل الإجراء في سجل التدقيق."
            : "Send a broadcast to users. The action is recorded in the audit log."}
        </p>
      </div>
      <div className="form-grid">
        <label className="wide">
          {ar ? "العنوان" : "Title"}
          <input
            required
            maxLength={120}
            value={form.title}
            onChange={(event) =>
              setForm({ ...form, title: event.target.value })
            }
          />
        </label>
        <label className="wide">
          {ar ? "نص الرسالة" : "Message"}
          <textarea
            required
            maxLength={1000}
            value={form.message}
            onChange={(event) =>
              setForm({ ...form, message: event.target.value })
            }
          />
        </label>
        <label>
          {ar ? "الجمهور" : "Audience"}
          <select
            value={form.audience}
            onChange={(event) =>
              setForm({ ...form, audience: event.target.value })
            }
          >
            <option value="all">{ar ? "كل المستخدمين" : "All users"}</option>
            <option value="active">
              {ar ? "النشطون خلال 30 يومًا" : "Active in the last 30 days"}
            </option>
            <option value="verified">
              {ar ? "الحسابات الموثقة" : "Verified accounts"}
            </option>
          </select>
        </label>
        <label>
          {ar ? "القناة" : "Channel"}
          <select
            value={form.channel}
            onChange={(event) =>
              setForm({ ...form, channel: event.target.value })
            }
          >
            <option value="push">{ar ? "إشعار داخلي" : "In-app"}</option>
            <option value="email">{ar ? "بريد إلكتروني" : "Email"}</option>
            <option value="both">{ar ? "الاثنان" : "Both"}</option>
          </select>
        </label>
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
      <Button type="submit" disabled={saving}>
        {saving
          ? ar
            ? "جارٍ الإرسال…"
            : "Sending…"
          : ar
            ? "إرسال الإشعار"
            : "Send notification"}
      </Button>
    </form>
  )
}

// ───────────────────────── Settings & audit ─────────────────────────

function AdminSettingRow({
  setting,
  language,
  onSaved,
  onError,
}: {
  setting: ApiAdminSetting
  language: Language
  onSaved: () => void
  onError: (message: string) => void
}) {
  const ar = language === "ar"
  const [value, setValue] = useState(JSON.stringify(setting.value ?? null))
  const [busy, setBusy] = useState(false)
  const save = async () => {
    setBusy(true)
    try {
      let parsed: unknown = value
      try {
        parsed = JSON.parse(value)
      } catch {
        parsed = value
      }
      await adminApi.updateSetting(setting.key, parsed, setting.group)
      onSaved()
    } catch (reason) {
      onError(
        errorText(
          reason,
          ar ? "تعذّر تحديث الإعداد." : "Could not update the setting.",
        ),
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <tr>
      <td>
        <b>{setting.key}</b>
        <br />
        <small>{setting.group}</small>
      </td>
      <td>
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          aria-label={setting.key}
        />
      </td>
      <td>
        <button type="button" disabled={busy} onClick={() => void save()}>
          {busy ? (ar ? "جارٍ الحفظ…" : "Saving…") : ar ? "حفظ" : "Save"}
        </button>
      </td>
    </tr>
  )
}

function AdminFlagRow({
  flag,
  language,
  onSaved,
  onError,
}: {
  flag: ApiAdminFlag
  language: Language
  onSaved: () => void
  onError: (message: string) => void
}) {
  const ar = language === "ar"
  const [rollout, setRollout] = useState(String(flag.rollout))
  const [busy, setBusy] = useState(false)
  const save = async (input: Record<string, unknown>) => {
    setBusy(true)
    try {
      await adminApi.updateFlag(flag.key, input)
      onSaved()
    } catch (reason) {
      onError(
        errorText(
          reason,
          ar ? "تعذّر تحديث الميزة." : "Could not update the feature flag.",
        ),
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="toggle-row">
      <div>
        <b>{flag.nameAr ?? flag.key}</b>
        <p>{flag.description ?? flag.key}</p>
        <div className="price-editor">
          <input
            type="number"
            min="0"
            max="100"
            value={rollout}
            onChange={(event) => setRollout(event.target.value)}
            aria-label={ar ? "نسبة الإطلاق" : "Rollout percentage"}
          />
          <Button
            kind="soft"
            disabled={busy}
            onClick={() => void save({ rollout: Number(rollout) })}
          >
            {ar ? "حفظ" : "Save"}
          </Button>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={flag.isEnabled}
        className={`toggle ${flag.isEnabled ? "on" : ""}`}
        disabled={busy}
        onClick={() => void save({ isEnabled: !flag.isEnabled })}
      >
        <i />
      </button>
    </div>
  )
}

function AdminSettings({ language }: { language: Language }) {
  const ar = language === "ar"
  const [settings, setSettings] = useState<ApiAdminSetting[]>([])
  const [flags, setFlags] = useState<ApiAdminFlag[]>([])
  const [filter, setFilter] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await adminApi.settings()
      setSettings(data.settings)
      setFlags(data.flags)
      setError("")
    } catch (reason) {
      setError(
        errorText(
          reason,
          ar ? "تعذّر تحميل الإعدادات." : "Could not load settings.",
        ),
      )
    } finally {
      setLoading(false)
    }
  }, [ar])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) return <AdminLoading language={language} />
  if (error) return <AdminError message={error} language={language} />

  const visible = settings.filter((setting) => {
    const needle = filter.trim().toLowerCase()
    return (
      !needle ||
      setting.key.toLowerCase().includes(needle) ||
      setting.group.toLowerCase().includes(needle)
    )
  })

  return (
    <div className="admin-settings-grid">
      <section className="settings-card">
        <div className="settings-heading">
          <h2>{ar ? "إعدادات المنصة" : "Platform settings"}</h2>
          <p>
            {ar
              ? "القيم تُحفظ بصيغة JSON وتُسجّل في سجل التدقيق."
              : "Values are stored as JSON and recorded in the audit log."}
          </p>
        </div>
        <div className="admin-search">
          <Icon name="search" size={16} />
          <input
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder={
              ar ? "ابحث في الإعدادات" : "Search settings"
            }
          />
        </div>
        <div className="admin-table table-scroll">
          <table>
            <thead>
              <tr>
                <th>{ar ? "المفتاح" : "Key"}</th>
                <th>{ar ? "القيمة" : "Value"}</th>
                <th>{ar ? "إجراء" : "Action"}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((setting) => (
                <AdminSettingRow
                  key={setting.key}
                  setting={setting}
                  language={language}
                  onSaved={() => void load()}
                  onError={setError}
                />
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="settings-card audit-log">
        <div className="settings-heading">
          <h2>{ar ? "مزايا المنصة" : "Feature flags"}</h2>
          <p>
            {ar
              ? "تحكم في تفعيل المزايا ونسبة الإطلاق."
              : "Control feature availability and rollout."}
          </p>
        </div>
        {flags.map((flag) => (
          <AdminFlagRow
            key={flag.key}
            flag={flag}
            language={language}
            onSaved={() => void load()}
            onError={setError}
          />
        ))}
        {flags.length === 0 && (
          <div className="empty-state">
            {ar ? "لا توجد مزايا مسجلة." : "No feature flags recorded."}
          </div>
        )}
      </section>
    </div>
  )
}

function AdminSecurity({ language }: { language: Language }) {
  const ar = language === "ar"
  const [status, setStatus] = useState<ApiAdminTwoFactorStatus | null>(null)
  const [setup, setSetup] = useState<ApiAdminTwoFactorSetup | null>(null)
  const [code, setCode] = useState("")
  const [disablePassword, setDisablePassword] = useState("")
  const [disableCode, setDisableCode] = useState("")
  const [passwordForm, setPasswordForm] = useState({
    current: "",
    next: "",
    confirm: "",
  })
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState("")
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [passwordMessage, setPasswordMessage] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setStatus(await adminApi.twoFactorStatus())
      setError("")
    } catch (reason) {
      setError(
        errorText(
          reason,
          ar
            ? "تعذّر تحميل حالة التحقق بخطوتين."
            : "Could not load two-step verification status.",
        ),
      )
    } finally {
      setLoading(false)
    }
  }, [ar])

  useEffect(() => {
    void load()
  }, [load])

  const startSetup = async () => {
    setError("")
    setMessage("")
    setBusy("setup")
    try {
      const data = await adminApi.setupTwoFactor()
      setSetup(data)
      setCode("")
    } catch (reason) {
      setError(
        errorText(
          reason,
          ar ? "تعذّر بدء الإعداد." : "Could not start setup.",
        ),
      )
    } finally {
      setBusy("")
    }
  }

  const enable = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setMessage("")
    if (!/^\d{6}$/.test(code)) {
      setError(
        ar
          ? "أدخل الكود المكوّن من 6 أرقام من تطبيق المصادقة."
          : "Enter the 6-digit code from your authenticator app.",
      )
      return
    }
    setBusy("enable")
    try {
      await adminApi.enableTwoFactor(code)
      setSetup(null)
      setCode("")
      setMessage(
        ar
          ? "تم تفعيل التحقق بخطوتين، وتم إنهاء الجلسات الإدارية الأخرى."
          : "Two-step verification is enabled, and other admin sessions were signed out.",
      )
      await load()
    } catch (reason) {
      setError(
        errorText(
          reason,
          ar ? "تعذّر تفعيل التحقق بخطوتين." : "Could not enable two-step verification.",
        ),
      )
    } finally {
      setBusy("")
    }
  }

  const disable = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setMessage("")
    if (!disablePassword) {
      setError(ar ? "أدخل كلمة المرور الحالية." : "Enter your current password.")
      return
    }
    if (!/^\d{6}$/.test(disableCode)) {
      setError(
        ar ? "أدخل كود التحقق المكوّن من 6 أرقام." : "Enter the 6-digit verification code.",
      )
      return
    }
    setBusy("disable")
    try {
      await adminApi.disableTwoFactor({
        password: disablePassword,
        code: disableCode,
      })
      setDisablePassword("")
      setDisableCode("")
      setMessage(
        ar
          ? "تم إيقاف التحقق بخطوتين. ننصح بإعادة تفعيله لحماية اللوحة."
          : "Two-step verification is disabled. We recommend enabling it again to protect the dashboard.",
      )
      await load()
    } catch (reason) {
      setError(
        errorText(
          reason,
          ar ? "تعذّر إيقاف التحقق بخطوتين." : "Could not disable two-step verification.",
        ),
      )
    } finally {
      setBusy("")
    }
  }

  const changePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPasswordError("")
    setPasswordMessage("")
    if (passwordForm.next.length < 10) {
      setPasswordError(
        ar
          ? "كلمة المرور الجديدة 10 أحرف على الأقل."
          : "The new password must be at least 10 characters.",
      )
      return
    }
    if (passwordForm.next !== passwordForm.confirm) {
      setPasswordError(
        ar ? "تأكيد كلمة المرور غير مطابق." : "The password confirmation does not match.",
      )
      return
    }
    setBusy("password")
    try {
      await adminApi.changePassword({
        currentPassword: passwordForm.current,
        newPassword: passwordForm.next,
      })
      setPasswordForm({ current: "", next: "", confirm: "" })
      setPasswordMessage(
        ar
          ? "تم تحديث كلمة المرور وإنهاء الجلسات الإدارية الأخرى."
          : "Your password was updated and other admin sessions were signed out.",
      )
    } catch (reason) {
      setPasswordError(
        errorText(
          reason,
          ar ? "تعذّر تحديث كلمة المرور." : "Could not update the password.",
        ),
      )
    } finally {
      setBusy("")
    }
  }

  if (loading) return <AdminLoading language={language} />

  return (
    <div className="admin-security-grid">
      <section className="settings-card">
        <div className="settings-heading">
          <h2>{ar ? "التحقق بخطوتين" : "Two-step verification"}</h2>
          <p>
            {ar
              ? "طبقة حماية إضافية للوحة الإدارة باستخدام تطبيق مصادقة — الكود يتغيّر كل 30 ثانية."
              : "An extra layer of protection for the admin dashboard using an authenticator app — the code changes every 30 seconds."}
          </p>
        </div>

        {error && (
          <div className="inline-feedback error" role="alert">
            {error}
          </div>
        )}
        {message && (
          <div className="inline-feedback" role="status">
            {message}
          </div>
        )}

        {status?.enabled ? (
          <>
            <p className="totp-status enabled">
              <Icon name="shield" size={16} />
              {ar
                ? "التحقق بخطوتين مفعّل على هذا الحساب."
                : "Two-step verification is enabled for this account."}
            </p>
            <form className="form-grid" onSubmit={disable}>
              <label>
                {ar ? "كلمة المرور الحالية" : "Current password"}
                <input
                  type="password"
                  autoComplete="current-password"
                  value={disablePassword}
                  onChange={(event) => setDisablePassword(event.target.value)}
                  dir="ltr"
                />
              </label>
              <label>
                {ar ? "كود التحقق" : "Verification code"}
                <input
                  value={disableCode}
                  onChange={(event) =>
                    setDisableCode(
                      event.target.value.replace(/\D/g, "").slice(0, 6),
                    )
                  }
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="000000"
                  dir="ltr"
                />
              </label>
              <div className="wide">
                <Button type="submit" kind="outline" disabled={busy === "disable"}>
                  {busy === "disable"
                    ? ar
                      ? "جارٍ الإيقاف…"
                      : "Disabling…"
                    : ar
                      ? "إيقاف التحقق بخطوتين"
                      : "Disable two-step verification"}
                </Button>
              </div>
            </form>
          </>
        ) : setup ? (
          <>
            <p>
              {ar
                ? "افتح تطبيق مصادقة (Google Authenticator أو Authy أو 1Password) وأضف الحساب يدويًا بالسر التالي، ثم أدخل الكود لتأكيد التفعيل."
                : "Open an authenticator app (Google Authenticator, Authy, or 1Password), add the account manually with the secret below, then enter the code to confirm."}
            </p>
            <div className="totp-secret-box">
              <small>{ar ? "سر الإعداد" : "Setup secret"}</small>
              <code dir="ltr">{setup.secret}</code>
              <button
                type="button"
                className="auth-method-link"
                onClick={() => {
                  const clipboard = navigator.clipboard
                  if (!clipboard?.writeText) {
                    setMessage(
                      ar
                        ? "تعذّر النسخ التلقائي — انسخ السر يدويًا."
                        : "Automatic copy failed — copy the secret manually.",
                    )
                    return
                  }
                  void clipboard
                    .writeText(setup.secret)
                    .then(() =>
                      setMessage(ar ? "تم نسخ السر." : "Secret copied."),
                    )
                    .catch(() =>
                      setMessage(
                        ar
                          ? "تعذّر النسخ التلقائي — انسخ السر يدويًا."
                          : "Automatic copy failed — copy the secret manually.",
                      ),
                    )
                }}
              >
                {ar ? "نسخ السر" : "Copy secret"}
              </button>
            </div>
            <a
              className="auth-method-link"
              href={setup.otpauthUri}
              dir="ltr"
            >
              {ar ? "فتح في تطبيق المصادقة" : "Open in authenticator app"}
            </a>
            <form className="form-grid" onSubmit={enable}>
              <label className="wide">
                {ar ? "كود التحقق من التطبيق" : "Code from the app"}
                <input
                  value={code}
                  onChange={(event) =>
                    setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="000000"
                  dir="ltr"
                  autoFocus
                />
              </label>
              <div className="wide totp-actions">
                <Button type="submit" disabled={busy === "enable"}>
                  {busy === "enable"
                    ? ar
                      ? "جارٍ التفعيل…"
                      : "Enabling…"
                    : ar
                      ? "تفعيل التحقق بخطوتين"
                      : "Enable two-step verification"}
                </Button>
                <button
                  type="button"
                  className="auth-method-link"
                  onClick={() => {
                    setSetup(null)
                    setCode("")
                    setError("")
                  }}
                >
                  {ar ? "إلغاء" : "Cancel"}
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            <p className="totp-status">
              <Icon name="lock" size={16} />
              {ar
                ? "التحقق بخطوتين غير مفعّل. فعّله الآن لحماية حسابك الإداري."
                : "Two-step verification is off. Enable it now to protect your admin account."}
            </p>
            <Button onClick={() => void startSetup()} disabled={busy === "setup"}>
              {busy === "setup"
                ? ar
                  ? "جارٍ الإعداد…"
                  : "Preparing…"
                : ar
                  ? "بدء إعداد التحقق بخطوتين"
                  : "Set up two-step verification"}
            </Button>
          </>
        )}
      </section>

      <section className="settings-card">
        <div className="settings-heading">
          <h2>{ar ? "كلمة مرور الإدارة" : "Admin password"}</h2>
          <p>
            {ar
              ? "استخدم 10 أحرف على الأقل. تغيير كلمة المرور ينهي الجلسات الإدارية الأخرى."
              : "Use at least 10 characters. Changing the password signs out other admin sessions."}
          </p>
        </div>
        {passwordError && (
          <div className="inline-feedback error" role="alert">
            {passwordError}
          </div>
        )}
        {passwordMessage && (
          <div className="inline-feedback" role="status">
            {passwordMessage}
          </div>
        )}
        <form className="form-grid" onSubmit={changePassword}>
          <label className="wide">
            {ar ? "كلمة المرور الحالية" : "Current password"}
            <input
              type="password"
              autoComplete="current-password"
              value={passwordForm.current}
              onChange={(event) =>
                setPasswordForm({ ...passwordForm, current: event.target.value })
              }
              dir="ltr"
            />
          </label>
          <label>
            {ar ? "كلمة المرور الجديدة" : "New password"}
            <input
              type="password"
              autoComplete="new-password"
              value={passwordForm.next}
              onChange={(event) =>
                setPasswordForm({ ...passwordForm, next: event.target.value })
              }
              dir="ltr"
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
              dir="ltr"
            />
          </label>
          <div className="wide">
            <Button type="submit" disabled={busy === "password"}>
              {busy === "password"
                ? ar
                  ? "جارٍ الحفظ…"
                  : "Saving…"
                : ar
                  ? "تحديث كلمة المرور"
                  : "Update password"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  )
}

function AdminAudit({ language }: { language: Language }) {
  const ar = language === "ar"
  const [page, setPage] = useState(1)
  const [action, setAction] = useState("")
  const [data, setData] = useState<{
    results: ApiAdminAudit[]
    total: number
    page: number
    pages: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(
        await adminApi.audit({
          action: action.trim() || undefined,
          page,
        }),
      )
      setError("")
    } catch (reason) {
      setError(
        errorText(
          reason,
          ar ? "تعذّر تحميل سجل التدقيق." : "Could not load the audit log.",
        ),
      )
    } finally {
      setLoading(false)
    }
  }, [action, page, ar])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load()
    }, 250)
    return () => window.clearTimeout(timer)
  }, [load])

  return (
    <>
      <div className="admin-toolbar">
        <div className="admin-search">
          <Icon name="search" size={16} />
          <input
            value={action}
            onChange={(event) => {
              setAction(event.target.value)
              setPage(1)
            }}
            placeholder={
              ar ? "ابحث في نوع الإجراء" : "Search by action"
            }
          />
        </div>
        <Button kind="soft" onClick={() => void load()}>
          {ar ? "تحديث" : "Refresh"}
        </Button>
      </div>
      {error && <AdminError message={error} language={language} />}
      {loading ? (
        <AdminLoading language={language} />
      ) : data ? (
        <section className="admin-table table-scroll">
          <div className="block-heading">
            <div>
              <h2>{ar ? "سجل التدقيق" : "Audit log"}</h2>
              <p>
                {ar
                  ? `${formatNumber(data.total, language)} إجراء`
                  : `${formatNumber(data.total, language)} actions`}
              </p>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>{ar ? "التاريخ" : "Date"}</th>
                <th>{ar ? "المشرف" : "Admin"}</th>
                <th>{ar ? "الإجراء" : "Action"}</th>
                <th>{ar ? "الهدف" : "Target"}</th>
                <th>{ar ? "السبب" : "Reason"}</th>
              </tr>
            </thead>
            <tbody>
              {data.results.map((entry) => (
                <tr key={entry.id}>
                  <td>{formatDateTime(entry.createdAt, language)}</td>
                  <td>{entry.actorAdmin?.name ?? (ar ? "النظام" : "System")}</td>
                  <td>{entry.action}</td>
                  <td>
                    {entry.targetType ?? "—"}
                    <br />
                    <small>{entry.targetId ?? ""}</small>
                  </td>
                  <td>{entry.reason ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <AdminPager
            page={data.page}
            pages={data.pages}
            onPage={setPage}
            language={language}
          />
        </section>
      ) : null}
    </>
  )
}

// ───────────────────────── Shell ─────────────────────────

type NavItem = {
  icon: IconName
  ar: string
  en: string
  key: string
  permission?: string
}

export default function AdminDashboard({
  back,
  language,
}: {
  back: () => void
  language: Language
  plans: PlanConfig[]
  setPlans: (plans: PlanConfig[]) => void
}) {
  const ar = language === "ar"
  const [admin, setAdmin] = useState<ApiAdmin | null>(null)
  const [view, setView] = useState("overview")
  const [toast, setToast] = useState("")

  const notify = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(""), 2800)
  }

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const data = await adminApi.me()
        if (!cancelled) setAdmin(data.admin)
      } catch {
        if (!cancelled) window.location.href = "/admin/login"
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const nav: NavItem[] = [
    { icon: "home", ar: "نظرة عامة", en: "Overview", key: "overview" },
    {
      icon: "user",
      ar: "المستخدمون والملفات",
      en: "Users & profiles",
      key: "users",
      permission: "users.view",
    },
    {
      icon: "shield",
      ar: "قائمة التحقق",
      en: "Verification queue",
      key: "verification",
      permission: "verification.review",
    },
    {
      icon: "bell",
      ar: "البلاغات والمخاطر",
      en: "Reports & risk",
      key: "reports",
      permission: "moderation.reports",
    },
    {
      icon: "heart",
      ar: "الباقات والحزم",
      en: "Plans & packages",
      key: "plans",
      permission: "finance.manage_packages",
    },
    {
      icon: "wallet",
      ar: "المدفوعات",
      en: "Payments",
      key: "payments",
      permission: "finance.view_transactions",
    },
    {
      icon: "clock",
      ar: "الاشتراكات",
      en: "Subscriptions",
      key: "subscriptions",
      permission: "finance.view_transactions",
    },
    {
      icon: "book",
      ar: "المحتوى والمجتمع",
      en: "Content & community",
      key: "content",
      permission: "content.manage_blog",
    },
    {
      icon: "users",
      ar: "المشرفون والصلاحيات",
      en: "Admins & RBAC",
      key: "access",
      permission: "system.manage_admins",
    },
    {
      icon: "sparkles",
      ar: "تحليلات المنصة",
      en: "Platform analytics",
      key: "analytics",
      permission: "analytics.view",
    },
    {
      icon: "bell",
      ar: "مركز الإشعارات",
      en: "Notification center",
      key: "broadcast",
      permission: "support.handle_users",
    },
    {
      icon: "shield",
      ar: "أمان الحساب",
      en: "Account security",
      key: "security",
    },
    {
      icon: "settings",
      ar: "الإعدادات والمزايا",
      en: "Settings & flags",
      key: "settings",
      permission: "system.manage_settings",
    },
    {
      icon: "shield",
      ar: "سجل التدقيق",
      en: "Audit log",
      key: "audit",
      permission: "system.view_audit_logs",
    },
  ]

  const can = (permission?: string) => {
    if (!permission) return true
    if (!admin) return true
    return (
      admin.isSuperAdmin ||
      admin.permissions.includes("*") ||
      admin.permissions.includes(permission)
    )
  }

  const visibleNav = nav.filter((item) => can(item.permission))
  const current = nav.find((item) => item.key === view)
  const roleNames =
    admin?.roles.map((role) => role.nameAr).join("، ") ||
    (admin?.isSuperAdmin
      ? ar
        ? "مشرف عام"
        : "Super admin"
      : ar
        ? "حساب إداري"
        : "Admin")

  useEffect(() => {
    if (admin && !visibleNav.some((item) => item.key === view)) {
      setView("overview")
    }
  }, [admin, view, visibleNav])

  const logout = async () => {
    try {
      await adminApi.logout()
    } finally {
      window.location.href = "/admin/login"
    }
  }

  return (
    <div className="admin-shell">
      <aside>
        <Logo light language={language} />
        <nav>
          {visibleNav.map((item) => (
            <button
              onClick={() => setView(item.key)}
              className={view === item.key ? "active" : ""}
              key={item.key}
            >
              <Icon name={item.icon} />
              {ar ? item.ar : item.en}
            </button>
          ))}
        </nav>
        <div className="admin-identity">
          <span>{admin ? admin.name.slice(0, 2).toUpperCase() : "AD"}</span>
          <div>
            <b>{admin?.name ?? (ar ? "حساب إداري" : "Admin account")}</b>
            <small>{roleNames}</small>
          </div>
        </div>
        <button className="admin-back" onClick={back}>
          {ar ? "العودة للموقع" : "Back to website"}
        </button>
      </aside>
      <main>
        <header>
          <div>
            <h1>{current ? (ar ? current.ar : current.en) : ""}</h1>
            <p>
              {admin
                ? `${admin.email} · ${roleNames}`
                : ar
                  ? "جارٍ التحقق من الجلسة…"
                  : "Verifying the session…"}
            </p>
          </div>
          <div className="admin-toolbar" style={{ margin: 0 }}>
            <Button kind="outline" onClick={() => void logout()}>
              {ar ? "تسجيل الخروج" : "Sign out"}
            </Button>
          </div>
        </header>
        <nav className="admin-mobile-nav">
          {visibleNav.map((item) => (
            <button
              key={item.key}
              onClick={() => setView(item.key)}
              className={view === item.key ? "active" : ""}
              aria-label={ar ? item.ar : item.en}
            >
              <Icon name={item.icon} />
            </button>
          ))}
        </nav>
        <div className="admin-content">
          {admin && !admin.twoFactorEnabled && view !== "security" && (
            <div className="admin-security-banner" role="status">
              <Icon name="shield" size={16} />
              <span>
                {ar
                  ? "حسابك الإداري بدون تحقق بخطوتين. فعّله لحماية اللوحة."
                  : "Your admin account does not use two-step verification. Enable it to protect the dashboard."}
              </span>
              <button type="button" onClick={() => setView("security")}>
                {ar ? "فعّله الآن" : "Enable now"}
              </button>
            </div>
          )}
          {view === "overview" && <AdminOverview language={language} />}
          {view === "users" && <AdminUsers language={language} />}
          {view === "verification" && (
            <AdminVerification language={language} />
          )}
          {view === "reports" && <AdminReports language={language} />}
          {view === "plans" && <AdminPlans language={language} />}
          {view === "payments" && <AdminPayments language={language} />}
          {view === "subscriptions" && (
            <AdminSubscriptions language={language} />
          )}
          {view === "content" && <AdminContent language={language} />}
          {view === "access" && (
            <AdminAccess language={language} currentAdminId={admin?.id} />
          )}
          {view === "analytics" && <AdminAnalytics language={language} />}
          {view === "broadcast" && <AdminBroadcast language={language} />}
          {view === "security" && <AdminSecurity language={language} />}
          {view === "settings" && <AdminSettings language={language} />}
          {view === "audit" && <AdminAudit language={language} />}
        </div>
      </main>
      {toast && (
        <div className="admin-toast" role="status">
          <Icon name="check" size={17} />
          {toast}
        </div>
      )}
    </div>
  )
}
