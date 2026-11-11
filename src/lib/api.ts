/**
 * عميل الـ API الخاص بالويب.
 * كل الطلبات تمر عبر rewrite في Next.js إلى BFF على نفس الأصل،
 * لذلك كوكي الجلسة httpOnly يعمل دون CORS.
 */

const BFF_BASE = "/api/bff"

export type ApiMeta = {
  requestId: string
  serverTime: string
}

export type ApiEnvelope<T,> = {
  data: T
  meta: ApiMeta
}

export type ApiErrorBody = {
  error: {
    code: string
    message: string
    details?: unknown
  }
  meta?: ApiMeta
}

export class ApiClientError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: unknown

  constructor(
    message: string,
    status: number,
    code = "INTERNAL_ERROR",
    details?: unknown,
  ) {
    super(message)
    this.name = "ApiClientError"
    this.status = status
    this.code = code
    this.details = details
  }
}

async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${BFF_BASE}${path}`, {
      ...init,
      credentials: "include",
      cache: "no-store",
      headers: {
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    })
  } catch {
    throw new ApiClientError(
      "تعذّر الاتصال بالخادم — تأكد من تشغيل الخدمة وحاول مرة أخرى.",
      0,
      "NETWORK_ERROR",
    )
  }

  const text = await response.text()
  let payload: unknown = null
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = null
    }
  }

  if (!response.ok) {
    const body = payload as ApiErrorBody | null
    throw new ApiClientError(
      body?.error?.message ?? "حدث خطأ غير متوقع — حاول مرة أخرى.",
      response.status,
      body?.error?.code ?? "INTERNAL_ERROR",
      body?.error?.details,
    )
  }

  return (payload as ApiEnvelope<T> | null)?.data as T
}

// ───────────────────────── الأنواع ─────────────────────────

export type ApiUser = {
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
  emailVerifiedAt: string | null
  createdAt: string
  hasPassword: boolean
  isSheikh: boolean
  sheikh: Record<string, unknown> | null
}

export type ApiSession = {
  expiresAt: string
}

export type ApiLoginResult = {
  user?: ApiUser
  session?: ApiSession
  rememberMe?: boolean
  twoFactorRequired?: boolean
  challenge?: string
  phoneHint?: string
  expiresInSeconds?: number
  resendAfterSeconds?: number
  devCode?: string
}

export type ApiOtpStart = {
  phone: string
  codeLength: number
  expiresInSeconds: number
  resendAfterSeconds?: number
  devCode?: string
}

export type ApiPasswordResetStart = {
  sent: boolean
  phoneHint?: string
  expiresInSeconds?: number
  resendAfterSeconds?: number
  devCode?: string
  message?: string
}

export type ApiMediaUpload = {
  key: string
  storageKey: string
  url: string
  contentType: string
  sizeBytes: number
  maxBytes: number
}

export type ApiGoogleConfig = {
  enabled: boolean
  clientId: string | null
}

export type ApiGoogleLoginResult = ApiLoginResult & {
  created?: boolean
  provider?: string
}

export type ApiPlanFeature = {
  limitValue: number | null
  feature: {
    key: string
    nameAr: string
    nameEn?: string
    descriptionAr?: string | null
  }
}

export type ApiPlan = {
  id: string
  key: string
  name: string
  nameEn?: string
  tier: string
  durationDays: number
  priceAmount: number
  annualPriceAmount?: number
  annualSavingsPercent?: number
  currency: string
  cycle: string
  descriptionAr?: string | null
  descriptionEn?: string | null
  isActive: boolean
  autoRenewDefault: boolean
  maxUsers: number | null
  sortOrder: number
  synthetic?: boolean
  features: ApiPlanFeature[]
}

export type ApiArticleCategory = {
  id: string
  key: string
  nameAr: string
  nameEn?: string
}

export type ApiArticleSummary = {
  id: string
  title: string
  slug: string
  excerpt: string | null
  coverUrl: string | null
  readTimeMinutes: number
  isFeatured: boolean
  views: number
  likes: number
  bookmarkCount: number
  publishedAt: string | null
  category: ApiArticleCategory | null
}

export type ApiArticleDetail = ApiArticleSummary & {
  body: string
  seoTitle: string | null
  metaDescription: string | null
  status: string
  helpfulCount: number
  notHelpfulCount: number
  createdAt: string
  _count?: { comments: number }
}

export type ApiArticleList = {
  results: ApiArticleSummary[]
  hasMore: boolean
}

// ───────────────────────── المصادقة ─────────────────────────

export async function getCurrentUser(): Promise<ApiUser | null> {
  try {
    const result = await apiRequest<{ user: ApiUser }>("/auth/me")
    return result.user
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 401) return null
    throw error
  }
}

export const authApi = {
  me: getCurrentUser,

  login(input: { identifier: string; password: string; rememberMe?: boolean }) {
    return apiRequest<ApiLoginResult>("/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    })
  },

  otpLoginStart(phone: string) {
    return apiRequest<ApiOtpStart>("/auth/otp/login/start", {
      method: "POST",
      body: JSON.stringify({ phone }),
    })
  },

  otpLoginVerify(input: { phone: string; code: string }) {
    return apiRequest<ApiLoginResult>("/auth/otp/login/verify", {
      method: "POST",
      body: JSON.stringify(input),
    })
  },

  twoFactorVerify(input: {
    challenge: string
    code: string
    rememberMe?: boolean
  }) {
    return apiRequest<ApiLoginResult>("/auth/login/2fa/verify", {
      method: "POST",
      body: JSON.stringify(input),
    })
  },

  twoFactorResend(challenge: string) {
    return apiRequest<ApiOtpStart>("/auth/login/2fa/resend", {
      method: "POST",
      body: JSON.stringify({ challenge }),
    })
  },

  phoneChangeStart(phone: string) {
    return apiRequest<ApiOtpStart>("/auth/phone/change/start", {
      method: "POST",
      body: JSON.stringify({ phone }),
    })
  },

  phoneChangeVerify(input: { phone: string; code: string }) {
    return apiRequest<{ user: ApiUser }>("/auth/phone/change/verify", {
      method: "POST",
      body: JSON.stringify(input),
    })
  },

  googleConfig() {
    return apiRequest<ApiGoogleConfig>("/auth/google/config")
  },

  googleLogin(input: { accessToken: string; rememberMe?: boolean }) {
    return apiRequest<ApiGoogleLoginResult>("/auth/google", {
      method: "POST",
      body: JSON.stringify(input),
    })
  },

  registerStart(phone: string) {
    return apiRequest<ApiOtpStart>("/auth/register/start", {
      method: "POST",
      body: JSON.stringify({ phone }),
    })
  },

  registerVerify(input: {
    phone: string
    code: string
    firstName?: string
    lastName?: string
    password?: string
  }) {
    return apiRequest<ApiLoginResult & { created: boolean }>(
      "/auth/register/verify-otp",
      {
        method: "POST",
        body: JSON.stringify(input),
      },
    )
  },

  logout() {
    return apiRequest<{ loggedOut: boolean }>("/auth/logout", {
      method: "POST",
      body: JSON.stringify({}),
    })
  },

  setPassword(input: { currentPassword?: string; newPassword: string }) {
    return apiRequest<{ passwordSet: boolean }>("/auth/set-password", {
      method: "POST",
      body: JSON.stringify(input),
    })
  },

  changePassword(input: { currentPassword: string; newPassword: string }) {
    return apiRequest<{ passwordChanged: boolean; sessionsRevoked: boolean }>(
      "/auth/change-password",
      { method: "POST", body: JSON.stringify(input) },
    )
  },

  forgotPasswordStart(identifier: string) {
    return apiRequest<ApiPasswordResetStart>("/auth/password/forgot/start", {
      method: "POST",
      body: JSON.stringify({ identifier }),
    })
  },

  forgotPasswordVerify(input: {
    identifier: string
    code: string
    newPassword: string
  }) {
    return apiRequest<{ passwordReset: boolean; revokedSessions: number }>(
      "/auth/password/forgot/verify",
      { method: "POST", body: JSON.stringify(input) },
    )
  },
}

// ───────────────────────── الوسائط ─────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ""))
    reader.onerror = () => reject(new Error("تعذّر قراءة الملف"))
    reader.readAsDataURL(file)
  })
}

export const mediaApi = {
  async upload(
    file: File,
    purpose: "profile_photo" | "community_image" = "profile_photo",
  ) {
    const base64Data = await fileToBase64(file)
    return apiRequest<ApiMediaUpload>("/media/direct-upload", {
      method: "POST",
      body: JSON.stringify({
        purpose,
        contentType: file.type || "image/jpeg",
        base64Data,
        fileName: file.name,
      }),
    })
  },
}

// ───────────────────────── الباقات والمقالات ─────────────────────────

export const plansApi = {
  list(country = "EG") {
    return apiRequest<ApiPlan[]>(
      `/subscriptions/plans?country=${encodeURIComponent(country)}`,
    )
  },
}

export const articlesApi = {
  list(
    params: {
      category?: string
      search?: string
      limit?: number
      before?: string
    } = {},
  ) {
    const searchParams = new URLSearchParams()
    if (params.category) searchParams.set("category", params.category)
    if (params.search) searchParams.set("search", params.search)
    if (params.limit) searchParams.set("limit", String(params.limit))
    if (params.before) searchParams.set("before", params.before)
    const query = searchParams.toString()
    return apiRequest<ApiArticleList>(
      `/blog/articles${query ? `?${query}` : ""}`,
    )
  },

  get(identifier: string) {
    return apiRequest<ApiArticleDetail>(
      `/blog/articles/${encodeURIComponent(identifier)}`,
    )
  },
}

// ───────────────────────── الإدارة ─────────────────────────

export type ApiAdminRole = {
  id: string
  key: string
  nameAr: string
  scope: string | null
}

export type ApiAdmin = {
  id: string
  name: string
  email: string
  phone: string | null
  avatarUrl: string | null
  status: string
  twoFactorEnabled: boolean
  lastLoginAt: string | null
  createdAt: string
  roles: ApiAdminRole[]
  permissions: string[]
  isSuperAdmin: boolean
}

export type ApiAdminLoginResult = {
  admin?: ApiAdmin
  twoFactorRequired?: boolean
  challenge?: string
  expiresInSeconds?: number
}

export type ApiAdminTwoFactorStatus = {
  enabled: boolean
  pending: boolean
}

export type ApiAdminTwoFactorSetup = {
  secret: string
  otpauthUri: string
  issuer: string
  account: string
  digits: number
  period: number
}

export type ApiAdminOverview = {
  counts: {
    users: number
    newUsers7: number
    activeUsers30: number
    pendingVerifications: number
    openReports: number
    matches: number
    messages: number
    activeSubscriptions: number
    revenue: number
  }
  recentAudit: Array<{
    id: string
    action: string
    targetType: string | null
    targetId: string | null
    reason: string | null
    createdAt: string
    actorAdmin: { name: string; email: string } | null
  }>
  recentUsers: Array<{
    id: string
    firstName: string
    lastName: string | null
    phone: string
    email: string | null
    city: string | null
    accountStatus: string
    verification: string
    createdAt: string
  }>
  signups: Array<{ day: string; count: number }>
  revenueSeries: Array<{ day: string; amount: number }>
  topCities: Array<{ city: string | null; count: number }>
}

export type ApiAdminUser = {
  id: string
  firstName: string
  lastName: string | null
  phone: string
  email: string | null
  gender: string | null
  city: string | null
  country: string | null
  accountStatus: string
  verification: string
  isVerifiedBadge: boolean
  profileQuality: number
  createdAt: string
  lastActiveAt: string | null
  _count?: { reportsMade: number; matchesAsA: number; matchesAsB: number }
}

export type ApiAdminVerification = {
  id: string
  userId: string
  status: string
  level: string | null
  submittedAt: string | null
  reviewedAt: string | null
  rejectionReasons: string[] | null
  createdAt: string
  user: {
    id: string
    firstName: string
    lastName: string | null
    phone: string
    email: string | null
    city: string | null
    verification: string
    profileQuality: number
  }
  steps: Array<{ id: string; step: string; status: string; createdAt: string }>
}

export type ApiAdminReport = {
  id: string
  reference: string
  targetType: string
  targetId: string
  details: string | null
  status: string
  createdAt: string
  resolvedAt: string | null
  reporter: { id: string; firstName: string; lastName: string | null; phone: string }
  reason: { id: string; labelAr: string } | null
}

export type ApiAdminArticle = {
  id: string
  title: string
  slug: string
  excerpt: string | null
  body: string
  coverUrl: string | null
  status: string
  isFeatured: boolean
  views: number
  likes: number
  publishedAt: string | null
  createdAt: string
  category: { id: string; nameAr: string } | null
}

export type ApiAdminPost = {
  id: string
  body: string
  status: string
  likeCount: number
  commentCount: number
  createdAt: string
  author: { id: string; firstName: string; lastName: string | null; phone: string }
  topic: { id: string; key: string; nameAr: string } | null
}

export type ApiAdminTopic = {
  id: string
  key: string
  nameAr: string
  icon: string | null
  isFollowable: boolean
  isSeasonal: boolean
  isActive: boolean
  sortOrder: number
}

export type ApiAdminPlan = {
  id: string
  key: string
  name: string
  tier: string
  durationDays: number
  priceAmount: number
  currency: string
  descriptionAr: string | null
  isActive: boolean
  autoRenewDefault: boolean
  sortOrder: number
  features: Array<{
    planId: string
    featureId: string
    limitValue: number | null
    feature: { id: string; key: string; nameAr: string; descriptionAr: string | null }
  }>
}

export type ApiAdminPackage = {
  id: string
  name: string
  key: string
  baseCredits: number
  bonusCredits: number
  priceAmount: number
  currency: string
  isPopular: boolean
  isActive: boolean
  sortOrder: number
}

export type ApiAdminPayment = {
  id: string
  reference: string
  purpose: string
  amount: number
  currency: string
  provider: string
  status: string
  createdAt: string
  paidAt: string | null
  user: { id: string; firstName: string; lastName: string | null; phone: string }
}

export type ApiAdminSubscription = {
  id: string
  status: string
  startedAt: string
  expiresAt: string
  autoRenew: boolean
  plan: { name: string; key: string }
  user: { id: string; firstName: string; lastName: string | null; phone: string }
}

export type ApiAdminSetting = {
  key: string
  value: unknown
  group: string
  updatedAt: string
}

export type ApiAdminFlag = {
  key: string
  nameAr: string | null
  description: string | null
  isEnabled: boolean
  rollout: number
  updatedAt: string
}

export type ApiAdminAudit = {
  id: string
  action: string
  targetType: string | null
  targetId: string | null
  reason: string | null
  createdAt: string
  actorAdmin: { id: string; name: string; email: string } | null
}

export type ApiAdminRow = {
  id: string
  name: string
  email: string
  phone: string | null
  status: string
  twoFactorEnabled: boolean
  lastLoginAt: string | null
  createdAt: string
  roles: Array<{ role: { id: string; key: string; nameAr: string } }>
}

export type ApiAdminRoleFull = {
  id: string
  key: string
  nameAr: string
  description: string | null
  rolePermissions: Array<{
    access: string
    permission: { id: string; key: string; group: string }
  }>
}

export type ApiAdminAnalytics = {
  signups: Array<{ day: string; count: number }>
  matches: Array<{ day: string; count: number }>
  messages: Array<{ day: string; count: number }>
  revenue: Array<{ day: string; amount: number }>
  verificationFunnel: Array<{ status: string; count: number }>
  topInterests: Array<{ name: string; count: number }>
}

type Paginated<T> = { results: T[]; total: number; page: number; pages: number }

export const adminApi = {
  login(input: { email: string; password: string }) {
    return apiRequest<ApiAdminLoginResult>("/admin/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    })
  },

  verifyTwoFactor(input: { challenge: string; code: string }) {
    return apiRequest<{ admin: ApiAdmin }>("/admin/auth/2fa/verify", {
      method: "POST",
      body: JSON.stringify(input),
    })
  },

  twoFactorStatus() {
    return apiRequest<ApiAdminTwoFactorStatus>("/admin/auth/2fa/status")
  },

  setupTwoFactor() {
    return apiRequest<ApiAdminTwoFactorSetup>("/admin/auth/2fa/setup", {
      method: "POST",
      body: JSON.stringify({}),
    })
  },

  enableTwoFactor(code: string) {
    return apiRequest<{ enabled: boolean; otherSessionsRevoked: number }>(
      "/admin/auth/2fa/enable",
      { method: "POST", body: JSON.stringify({ code }) },
    )
  },

  disableTwoFactor(input: { password: string; code: string }) {
    return apiRequest<{ enabled: boolean; otherSessionsRevoked: number }>(
      "/admin/auth/2fa/disable",
      { method: "POST", body: JSON.stringify(input) },
    )
  },

  me() {
    return apiRequest<{ admin: ApiAdmin }>("/admin/auth/me")
  },

  logout() {
    return apiRequest<{ loggedOut: boolean }>("/admin/auth/logout", {
      method: "POST",
      body: JSON.stringify({}),
    })
  },

  changePassword(input: { currentPassword: string; newPassword: string }) {
    return apiRequest<{ changed: boolean }>("/admin/auth/change-password", {
      method: "POST",
      body: JSON.stringify(input),
    })
  },

  overview() {
    return apiRequest<ApiAdminOverview>("/admin/overview")
  },

  users(params: {
    q?: string
    status?: string
    page?: number
    limit?: number
  } = {}) {
    return apiRequest<Paginated<ApiAdminUser>>(
      `/admin/users${queryString(params)}`,
    )
  },

  updateUserStatus(id: string, status: string, reason: string) {
    return apiRequest<{ updated: boolean; status: string }>(
      `/admin/users/${encodeURIComponent(id)}/status`,
      { method: "PATCH", body: JSON.stringify({ status, reason }) },
    )
  },

  verifications(params: { status?: string; page?: number } = {}) {
    return apiRequest<Paginated<ApiAdminVerification>>(
      `/admin/verifications${queryString(params)}`,
    )
  },

  reviewVerification(id: string, status: "approved" | "rejected", reason?: string) {
    return apiRequest<{ reviewed: boolean; status: string }>(
      `/admin/verifications/${encodeURIComponent(id)}`,
      { method: "PATCH", body: JSON.stringify({ status, reason }) },
    )
  },

  reports(params: { status?: string; page?: number } = {}) {
    return apiRequest<Paginated<ApiAdminReport>>(
      `/admin/reports${queryString(params)}`,
    )
  },

  reviewReport(
    id: string,
    input: { status: string; action?: string; reason?: string },
  ) {
    return apiRequest<{ reviewed: boolean; status: string }>(
      `/admin/reports/${encodeURIComponent(id)}`,
      { method: "PATCH", body: JSON.stringify(input) },
    )
  },

  reportReasons() {
    return apiRequest<{ reasons: Array<{ id: string; labelAr: string }> }>(
      "/admin/report-reasons",
    )
  },

  articles(params: { status?: string; q?: string; page?: number } = {}) {
    return apiRequest<Paginated<ApiAdminArticle>>(
      `/admin/articles${queryString(params)}`,
    )
  },

  createArticle(input: Record<string, unknown>) {
    return apiRequest<{ article: ApiAdminArticle }>("/admin/articles", {
      method: "POST",
      body: JSON.stringify(input),
    })
  },

  updateArticle(id: string, input: Record<string, unknown>) {
    return apiRequest<{ article: ApiAdminArticle }>(
      `/admin/articles/${encodeURIComponent(id)}`,
      { method: "PATCH", body: JSON.stringify(input) },
    )
  },

  posts(params: { status?: string; page?: number } = {}) {
    return apiRequest<Paginated<ApiAdminPost>>(
      `/admin/posts${queryString(params)}`,
    )
  },

  moderatePost(id: string, status: string) {
    return apiRequest<{ post: ApiAdminPost }>(
      `/admin/posts/${encodeURIComponent(id)}`,
      { method: "PATCH", body: JSON.stringify({ status }) },
    )
  },

  topics() {
    return apiRequest<{ topics: ApiAdminTopic[] }>("/admin/topics")
  },

  createTopic(input: Record<string, unknown>) {
    return apiRequest<{ topic: ApiAdminTopic }>("/admin/topics", {
      method: "POST",
      body: JSON.stringify(input),
    })
  },

  plans() {
    return apiRequest<{ plans: ApiAdminPlan[] }>("/admin/plans")
  },

  updatePlan(id: string, input: Record<string, unknown>) {
    return apiRequest<{ plan: ApiAdminPlan }>(
      `/admin/plans/${encodeURIComponent(id)}`,
      { method: "PATCH", body: JSON.stringify(input) },
    )
  },

  packages() {
    return apiRequest<{ packages: ApiAdminPackage[] }>("/admin/packages")
  },

  updatePackage(id: string, input: Record<string, unknown>) {
    return apiRequest<{ package: ApiAdminPackage }>(
      `/admin/packages/${encodeURIComponent(id)}`,
      { method: "PATCH", body: JSON.stringify(input) },
    )
  },

  payments(params: { status?: string; page?: number } = {}) {
    return apiRequest<Paginated<ApiAdminPayment>>(
      `/admin/payments${queryString(params)}`,
    )
  },

  markPaymentPaid(id: string, note?: string) {
    return apiRequest<{ paid: boolean; payment?: ApiAdminPayment }>(
      `/admin/payments/${encodeURIComponent(id)}/mark-paid`,
      { method: "POST", body: JSON.stringify({ note }) },
    )
  },

  subscriptions(params: { page?: number } = {}) {
    return apiRequest<Paginated<ApiAdminSubscription>>(
      `/admin/subscriptions${queryString(params)}`,
    )
  },

  settings() {
    return apiRequest<{ settings: ApiAdminSetting[]; flags: ApiAdminFlag[] }>(
      "/admin/settings",
    )
  },

  updateSetting(key: string, value: unknown, group?: string) {
    return apiRequest<{ setting: ApiAdminSetting }>(
      `/admin/settings/${encodeURIComponent(key)}`,
      { method: "PATCH", body: JSON.stringify({ value, group }) },
    )
  },

  updateFlag(key: string, input: Record<string, unknown>) {
    return apiRequest<{ flag: ApiAdminFlag }>(
      `/admin/feature-flags/${encodeURIComponent(key)}`,
      { method: "PATCH", body: JSON.stringify(input) },
    )
  },

  audit(params: { action?: string; targetType?: string; page?: number } = {}) {
    return apiRequest<Paginated<ApiAdminAudit>>(
      `/admin/audit${queryString(params)}`,
    )
  },

  admins() {
    return apiRequest<{ admins: ApiAdminRow[] }>("/admin/admins")
  },

  createAdmin(input: {
    name: string
    email: string
    phone?: string
    password: string
    roleKey: string
  }) {
    return apiRequest<{ admin: ApiAdminRow }>("/admin/admins", {
      method: "POST",
      body: JSON.stringify(input),
    })
  },

  updateAdmin(id: string, input: Record<string, unknown>) {
    return apiRequest<{ admin: ApiAdminRow }>(
      `/admin/admins/${encodeURIComponent(id)}`,
      { method: "PATCH", body: JSON.stringify(input) },
    )
  },

  resetAdminTwoFactor(id: string) {
    return apiRequest<{ reset: boolean; otherSessionsRevoked: number }>(
      `/admin/admins/${encodeURIComponent(id)}/2fa/reset`,
      { method: "POST", body: JSON.stringify({}) },
    )
  },

  roles() {
    return apiRequest<{ roles: ApiAdminRoleFull[] }>("/admin/roles")
  },

  analytics() {
    return apiRequest<ApiAdminAnalytics>("/admin/analytics")
  },

  broadcast(input: {
    title: string
    message: string
    audience: "all" | "active" | "verified"
    channel?: "push" | "email" | "both"
  }) {
    return apiRequest<{ sent: number }>("/admin/notifications/broadcast", {
      method: "POST",
      body: JSON.stringify(input),
    })
  },
}

function queryString(params: Record<string, unknown>): string {
  const q = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "" && value !== null) {
      q.set(key, String(value))
    }
  })
  return q.size ? `?${q}` : ""
}

// ───────────────────────── الملف الشخصي ─────────────────────────

export type ApiCompletion = {
  percent: number
  basicsComplete: boolean
  missing: string[]
  breakdown: Record<string, number>
}

export type ApiPhoto = {
  id: string
  url: string
  category: string
  isPrimary: boolean
  orderIndex: number
  status: string
  createdAt: string
}

export type ApiFullProfile = {
  user: ApiUser
  profile: {
    nationality: string | null
    maritalStatus: string | null
    hasChildren: boolean | null
    childrenCount: number | null
    heightCm: number | null
    education: string | null
    university: string | null
    profession: string | null
    incomeRange: string | null
    languages: string[]
    smoking: string | null
    jobStability: string | null
  } | null
  marriage: {
    marriageIntent: string | null
    marriageTimeline: string | null
    wantsChildren: string | null
    relocation: string | null
    livingPreference: string | null
    religion: string | null
    sect: string | null
  } | null
  about: {
    bio: string | null
    interests: string[]
    personality: string[]
    lifestyle: string[]
    lookingFor: string | null
  } | null
  preferences: {
    countries: string[]
    ageMin: number | null
    ageMax: number | null
    heightMin: number | null
    heightMax: number | null
  } | null
  privacy: {
    profileVisibility: string
    showOnlineStatus: boolean
    hideLastSeen: boolean
    cityOnlyLocation: boolean
    searchable: boolean
    privatePhotosNeedApproval: boolean
    profilePhotosNeedApproval: boolean
    watermarkPhotos: boolean
  } | null
  notifications: {
    match: boolean
    messages: boolean
    calls: boolean
    community: boolean
    emailWeekly: boolean
    newLoginAlerts: boolean
    twoFactorEnabled: boolean
  } | null
  photos: ApiPhoto[]
  coreValues: Array<{ id: string; key: string; labelAr: string }>
  dealBreakers: Array<{ id: string; key: string; labelAr: string }>
  wallet: { balanceCredits: number; currency: string } | null
  completion: ApiCompletion
}

export type ApiCatalog = {
  coreValues: Array<{ id: string; key: string; labelAr: string; labelEn?: string | null }>
  dealBreakers: Array<{ id: string; key: string; labelAr: string; labelEn?: string | null }>
}

export const profileApi = {
  get() {
    return apiRequest<ApiFullProfile>("/profile")
  },
  completion() {
    return apiRequest<ApiCompletion>("/profile/completion")
  },
  basics(input: {
    firstName?: string
    lastName?: string | null
    gender?: "male" | "female"
    dateOfBirth?: string
    country?: string
    city?: string
  }) {
    return apiRequest<{ user: ApiUser; completion: ApiCompletion }>(
      "/profile/basics",
      { method: "PATCH", body: JSON.stringify(input) },
    )
  },
  details(input: Record<string, unknown>) {
    return apiRequest<{ completion: ApiCompletion }>("/profile/details", {
      method: "PATCH",
      body: JSON.stringify(input),
    })
  },
  marriage(input: Record<string, unknown>) {
    return apiRequest<{ completion: ApiCompletion }>("/profile/marriage", {
      method: "PATCH",
      body: JSON.stringify(input),
    })
  },
  about(input: Record<string, unknown>) {
    return apiRequest<{ completion: ApiCompletion }>("/profile/about", {
      method: "PATCH",
      body: JSON.stringify(input),
    })
  },
  preferences(input: Record<string, unknown>) {
    return apiRequest<{ completion: ApiCompletion }>("/profile/preferences", {
      method: "PATCH",
      body: JSON.stringify(input),
    })
  },
  privacy(input: Record<string, unknown>) {
    return apiRequest<{ completion: ApiCompletion }>("/profile/privacy", {
      method: "PATCH",
      body: JSON.stringify(input),
    })
  },
  notifications(input: Record<string, unknown>) {
    return apiRequest<unknown>("/profile/notifications", {
      method: "PATCH",
      body: JSON.stringify(input),
    })
  },
  catalog() {
    return apiRequest<ApiCatalog>("/profile/catalog")
  },
  photos() {
    return apiRequest<{ photos: ApiPhoto[] }>("/profile/photos")
  },
  addPhoto(input: {
    url?: string
    storageKey?: string
    category?: "public" | "private" | "one_time" | "temporary"
    isPrimary?: boolean
    orderIndex?: number
  }) {
    return apiRequest<{ photo: ApiPhoto; completion: ApiCompletion }>(
      "/profile/photos",
      { method: "POST", body: JSON.stringify(input) },
    )
  },
  removePhoto(id: string) {
    return apiRequest<{ removed: boolean }>(
      `/profile/photos/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    )
  },
  setDealBreakers(keys: string[]) {
    return apiRequest<{ completion: ApiCompletion }>("/profile/deal-breakers", {
      method: "PUT",
      body: JSON.stringify({ keys }),
    })
  },
  setCoreValues(keys: string[]) {
    return apiRequest<{ completion: ApiCompletion }>("/profile/core-values", {
      method: "PUT",
      body: JSON.stringify({ keys }),
    })
  },
  onboarding(input: Record<string, unknown>) {
    return apiRequest<ApiFullProfile>("/profile/onboarding", {
      method: "POST",
      body: JSON.stringify(input),
    })
  },
  exportData() {
    return apiRequest<{ exportedAt: string; data: ApiFullProfile }>(
      "/profile/export",
      { method: "POST", body: JSON.stringify({}) },
    )
  },
  deleteAccount(input: { password?: string; confirmation: "DELETE" }) {
    return apiRequest<{ deleted: boolean }>("/profile", {
      method: "DELETE",
      body: JSON.stringify(input),
    })
  },
}

// ───────────────────────── الاكتشاف ─────────────────────────

export type ApiCard = {
  id: string
  name: string
  age: number | null
  gender: string | null
  city: string | null
  country: string | null
  profession: string | null
  education: string | null
  maritalStatus: string | null
  heightCm: number | null
  bio: string | null
  interests: string[]
  personality: string[]
  lifestyle: string[]
  marriageIntent: string | null
  marriageTimeline: string | null
  wantsChildren: string | null
  relocation: string | null
  livingPreference: string | null
  photo: string | null
  photos: Array<{ id: string; url: string; isPrimary: boolean }>
  verified: boolean
  profileQuality: number
  score: number
  lastActiveAt: string | null
}

export type ApiDiscoveryDashboard = {
  counts: {
    recommendations: number
    interestsReceived: number
    matches: number
    unreadNotifications: number
  }
  completion: ApiCompletion
  recommendations: ApiCard[]
}

export const discoveryApi = {
  dashboard() {
    return apiRequest<ApiDiscoveryDashboard>("/discovery/dashboard")
  },
  recommendations(params: { limit?: number; cursor?: string } = {}) {
    const q = new URLSearchParams()
    if (params.limit) q.set("limit", String(params.limit))
    if (params.cursor) q.set("cursor", params.cursor)
    return apiRequest<{
      results: ApiCard[]
      hasMore: boolean
      nextCursor: string | null
    }>(`/discovery/recommendations${q.size ? `?${q}` : ""}`)
  },
  search(
    params: {
      gender?: "male" | "female"
      ageMin?: number
      ageMax?: number
      city?: string
      country?: string
      education?: string
      maritalStatus?: string
      q?: string
      page?: number
      limit?: number
    } = {},
  ) {
    const q = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== "" && value !== null) {
        q.set(key, String(value))
      }
    })
    return apiRequest<{
      results: ApiCard[]
      total: number
      page: number
      pages: number
    }>(`/discovery/search${q.size ? `?${q}` : ""}`)
  },
  profile(id: string) {
    return apiRequest<{
      profile: ApiCard
      isSelf: boolean
      canMessage?: boolean
      matchId?: string | null
    }>(`/discovery/profile/${encodeURIComponent(id)}`)
  },
  interests(type: "received" | "sent" = "received") {
    return apiRequest<{
      results: Array<{
        id: string
        action: string
        createdAt: string
        user: ApiCard
      }>
      type: string
    }>(`/discovery/interests?type=${type}`)
  },
  respondInterest(id: string, action: "accept" | "decline") {
    return apiRequest<{
      accepted: boolean
      matchId?: string
      conversationId?: string
    }>(`/discovery/interests/${encodeURIComponent(id)}/respond`, {
      method: "POST",
      body: JSON.stringify({ action }),
    })
  },
  like(input: {
    targetId: string
    action?: "like" | "pass" | "favorite" | "serious_interest"
  }) {
    return apiRequest<{
      action: string
      id: string
      matched: boolean
      matchId: string | null
      conversationId: string | null
      costCredits: number
      balance: number
    }>("/discovery/likes", {
      method: "POST",
      body: JSON.stringify(input),
    })
  },
  favorites() {
    return apiRequest<{
      results: Array<{ id: string; createdAt: string; user: ApiCard }>
    }>("/discovery/favorites")
  },
  removeFavorite(targetId: string) {
    return apiRequest<{ removed: boolean }>(
      `/discovery/favorites/${encodeURIComponent(targetId)}`,
      { method: "DELETE" },
    )
  },
  matches() {
    return apiRequest<{
      results: Array<{ id: string; matchedAt: string; user: ApiCard }>
    }>("/discovery/matches")
  },
  unmatch(id: string) {
    return apiRequest<{ unmatched: boolean }>(
      `/discovery/matches/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    )
  },
  blocked() {
    return apiRequest<{
      results: Array<{ id: string; createdAt: string; user: ApiCard }>
    }>("/discovery/blocked")
  },
  block(targetId: string, reason?: string) {
    return apiRequest<{ blocked: boolean }>(
      `/discovery/block/${encodeURIComponent(targetId)}`,
      { method: "POST", body: JSON.stringify({ reason }) },
    )
  },
  unblock(targetId: string) {
    return apiRequest<{ unblocked: boolean }>(
      `/discovery/block/${encodeURIComponent(targetId)}`,
      { method: "DELETE" },
    )
  },
  reportReasons() {
    return apiRequest<{
      reasons: Array<{ id: string; labelAr: string; labelEn?: string | null }>
    }>("/discovery/report-reasons")
  },
  report(input: {
    targetType: "user" | "post" | "comment" | "message" | "call" | "photo" | "article"
    targetId: string
    reasonId?: string
    details?: string
  }) {
    return apiRequest<{
      report: { id: string; reference: string; status: string }
    }>("/discovery/reports", {
      method: "POST",
      body: JSON.stringify(input),
    })
  },
  views() {
    return apiRequest<{
      results: Array<{ id: string; viewedAt: string; user: ApiCard }>
    }>("/discovery/views")
  },
}

// ───────────────────────── الرسائل ─────────────────────────

export type ApiConversation = {
  id: string
  matchId: string | null
  type: string
  lastMessageAt: string | null
  createdAt: string
  unread: number
  user: { id: string; name: string; photo: string | null; verified: boolean } | null
  lastMessage: {
    id: string
    body: string
    type: string
    senderId: string
    createdAt: string
    mine: boolean
  } | null
}

export type ApiMessage = {
  id: string
  body: string
  type: string
  mine: boolean
  sender?: { id: string; firstName: string; lastName: string | null }
  attachments?: unknown[]
  createdAt: string
}

export const messagingApi = {
  conversations() {
    return apiRequest<{ results: ApiConversation[] }>("/messages/conversations")
  },
  unreadCount() {
    return apiRequest<{ unread: number }>("/messages/unread-count")
  },
  conversation(id: string, params: { before?: string; limit?: number } = {}) {
    const q = new URLSearchParams()
    if (params.before) q.set("before", params.before)
    if (params.limit) q.set("limit", String(params.limit))
    return apiRequest<{
      conversation: {
        id: string
        matchId: string | null
        status: string
        user: { id: string; name: string; photo: string | null; verified: boolean } | null
      }
      results: ApiMessage[]
      hasMore: boolean
      nextCursor: string | null
    }>(`/messages/conversations/${encodeURIComponent(id)}${q.size ? `?${q}` : ""}`)
  },
  send(id: string, body: string, type = "text") {
    return apiRequest<{ message: ApiMessage }>(
      `/messages/conversations/${encodeURIComponent(id)}/messages`,
      { method: "POST", body: JSON.stringify({ body, type }) },
    )
  },
  markRead(id: string) {
    return apiRequest<{ read: number }>(
      `/messages/conversations/${encodeURIComponent(id)}/read`,
      { method: "POST", body: JSON.stringify({}) },
    )
  },
  archive(id: string) {
    return apiRequest<{ archived: boolean }>(
      `/messages/conversations/${encodeURIComponent(id)}/archive`,
      { method: "POST", body: JSON.stringify({}) },
    )
  },
  requests() {
    return apiRequest<{
      results: Array<{
        id: string
        conversationId: string
        status: string
        createdAt: string
        user: { id: string; name: string; photo: string | null }
      }>
    }>("/messages/requests")
  },
  respondRequest(id: string, action: "accept" | "ignore") {
    return apiRequest<{ status: string }>(
      `/messages/requests/${encodeURIComponent(id)}/respond`,
      { method: "POST", body: JSON.stringify({ action }) },
    )
  },
}

// ───────────────────────── الإشعارات ─────────────────────────

export type ApiNotification = {
  id: string
  type: string
  title: string
  body: string
  data: Record<string, unknown> | null
  isRead: boolean
  readAt: string | null
  createdAt: string
}

export const notificationsApi = {
  list(params: { unread?: boolean; limit?: number; before?: string } = {}) {
    const q = new URLSearchParams()
    if (params.unread !== undefined) q.set("unread", String(params.unread))
    if (params.limit) q.set("limit", String(params.limit))
    if (params.before) q.set("before", params.before)
    return apiRequest<{ results: ApiNotification[]; unread: number }>(
      `/notifications${q.size ? `?${q}` : ""}`,
    )
  },
  read(id: string) {
    return apiRequest<{ read: boolean }>(
      `/notifications/${encodeURIComponent(id)}/read`,
      { method: "POST", body: JSON.stringify({}) },
    )
  },
  readAll() {
    return apiRequest<{ read: number }>("/notifications/read-all", {
      method: "POST",
      body: JSON.stringify({}),
    })
  },
  remove(id: string) {
    return apiRequest<{ removed: boolean }>(
      `/notifications/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    )
  },
}

// ───────────────────────── المحفظة ─────────────────────────

export type ApiCreditPackage = {
  id: string
  name: string
  key: string
  baseCredits: number
  bonusCredits: number
  priceAmount: number
  currency: string
  oldPriceAmount: number | null
  badge: string | null
  ribbon: string | null
  isPopular: boolean
  isActive: boolean
  sortOrder: number
}

export type ApiCreditTransaction = {
  id: string
  reference: string
  type: string
  amount: number
  balanceAfter: number
  description: string | null
  createdAt: string
}

export type ApiWallet = {
  balance: number
  currency: string
  transactions: ApiCreditTransaction[]
  packages: ApiCreditPackage[]
  subscriptions: Array<{
    id: string
    status: string
    startedAt: string
    expiresAt: string
    autoRenew: boolean
    plan: { id: string; name: string; key: string; priceAmount: number; currency: string }
  }>
  payments: Array<{
    id: string
    reference: string
    purpose: string
    amount: number
    currency: string
    provider: string
    status: string
    createdAt: string
    paidAt: string | null
  }>
}

export const walletApi = {
  get() {
    return apiRequest<ApiWallet>("/wallet")
  },
  packages() {
    return apiRequest<{ packages: ApiCreditPackage[] }>("/wallet/packages")
  },
  transactions() {
    return apiRequest<{ results: ApiCreditTransaction[] }>("/wallet/transactions")
  },
  checkout(purpose: "credit_package" | "subscription", refId: string) {
    return apiRequest<{
      payment: { id: string; reference: string; status: string }
      paid: boolean
      checkoutUrl?: string | null
      balance?: number
      message?: string
    }>("/wallet/checkout", {
      method: "POST",
      body: JSON.stringify({ purpose, refId }),
    })
  },
  subscriptions() {
    return apiRequest<{ subscriptions: ApiWallet["subscriptions"] }>(
      "/wallet/subscriptions",
    )
  },
  cancelSubscription(id: string) {
    return apiRequest<{ cancelled: boolean }>(
      `/wallet/subscriptions/${encodeURIComponent(id)}/cancel`,
      { method: "POST", body: JSON.stringify({}) },
    )
  },
  payments() {
    return apiRequest<{ payments: ApiWallet["payments"] }>("/wallet/payments")
  },
}

// ───────────────────────── المجتمع ─────────────────────────

export type ApiCommunityTopic = {
  id: string
  key: string
  nameAr: string
  icon: string | null
  posts: number
  followers: number
  followed: boolean
}

export type ApiCommunityPost = {
  id: string
  body: string
  topic: { id: string; key: string; nameAr: string } | null
  author: { id: string; name: string; photo: string | null; verified: boolean }
  media: Array<{ id: string; url: string; type: string }>
  likeCount: number
  commentCount: number
  bookmarkCount: number
  liked: boolean
  bookmarked: boolean
  comments: number
  isPinned: boolean
  createdAt: string
  publishedAt: string | null
}

export const communityApi = {
  topics() {
    return apiRequest<{ topics: ApiCommunityTopic[] }>("/community/topics")
  },
  posts(params: { topic?: string; page?: number; limit?: number } = {}) {
    const q = new URLSearchParams()
    if (params.topic) q.set("topic", params.topic)
    if (params.page) q.set("page", String(params.page))
    if (params.limit) q.set("limit", String(params.limit))
    return apiRequest<{
      results: ApiCommunityPost[]
      total: number
      page: number
      pages: number
    }>(`/community/posts${q.size ? `?${q}` : ""}`)
  },
  post(id: string) {
    return apiRequest<{
      post: ApiCommunityPost & {
        comments: Array<{
          id: string
          body: string
          author: { id: string; name: string; photo: string | null; verified: boolean }
          likeCount: number
          createdAt: string
        }>
      }
    }>(`/community/posts/${encodeURIComponent(id)}`)
  },
  createPost(input: { body: string; topicId?: string }) {
    return apiRequest<{ post: { id: string; status: string }; message: string }>(
      "/community/posts",
      { method: "POST", body: JSON.stringify(input) },
    )
  },
  comment(postId: string, body: string) {
    return apiRequest<{ comment: { id: string; body: string; createdAt: string } }>(
      `/community/posts/${encodeURIComponent(postId)}/comments`,
      { method: "POST", body: JSON.stringify({ body }) },
    )
  },
  react(postId: string, kind: "like" | "bookmark") {
    return apiRequest<{ active: boolean }>(
      `/community/posts/${encodeURIComponent(postId)}/reactions`,
      { method: "POST", body: JSON.stringify({ kind }) },
    )
  },
  followTopic(id: string) {
    return apiRequest<{ following: boolean }>(
      `/community/topics/${encodeURIComponent(id)}/follow`,
      { method: "POST", body: JSON.stringify({}) },
    )
  },
  removePost(id: string) {
    return apiRequest<{ removed: boolean }>(
      `/community/posts/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    )
  },
}

// ───────────────────────── الولي ─────────────────────────

export type ApiWaliData = {
  links: Array<{
    id: string
    status: string
    linkedSince: string
    sharedConversationsCount: number
    wali: {
      id: string
      name: string
      relation: string
      phone: string
      email: string | null
      isVerified: boolean
    }
    permissions: {
      viewMatchedCandidates: boolean
      viewVerificationStatus: boolean
      joinGroupChats: boolean
      readDirectChats: boolean
    } | null
  }>
  invitations: Array<{
    id: string
    phone: string
    email: string | null
    status: string
    expiresAt: string
    createdAt: string
  }>
}

export const waliApi = {
  get() {
    return apiRequest<ApiWaliData>("/wali")
  },
  invite(input: {
    name: string
    relation: "father" | "older_brother" | "paternal_uncle" | "maternal_uncle" | "other"
    phone: string
    email?: string
    permissions?: {
      viewMatchedCandidates?: boolean
      viewVerificationStatus?: boolean
      joinGroupChats?: boolean
      readDirectChats?: boolean
    }
  }) {
    return apiRequest<{
      link: { id: string; status: string }
      invitation: { id: string; expiresAt: string }
      inviteUrl?: string
      devToken?: string
      smsSent: boolean
      message: string
    }>("/wali/invite", { method: "POST", body: JSON.stringify(input) })
  },
  updatePermissions(id: string, permissions: Record<string, boolean>) {
    return apiRequest<{ permissions: ApiWaliData["links"][number]["permissions"] }>(
      `/wali/links/${encodeURIComponent(id)}/permissions`,
      { method: "PATCH", body: JSON.stringify(permissions) },
    )
  },
  revoke(id: string) {
    return apiRequest<{ revoked: boolean }>(
      `/wali/links/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    )
  },
}

// ───────────────────────── المكالمات ─────────────────────────

export type ApiCall = {
  id: string
  type: "voice" | "video"
  status: string
  direction: "incoming" | "outgoing"
  user: { id: string; name: string; photo: string | null; verified: boolean }
  ratePerMinute: number
  durationSeconds: number
  creditsConsumed: number
  startedAt: string | null
  endedAt: string | null
  createdAt: string
}

export const callsApi = {
  list(params: { page?: number; limit?: number } = {}) {
    const q = new URLSearchParams()
    if (params.page) q.set("page", String(params.page))
    if (params.limit) q.set("limit", String(params.limit))
    return apiRequest<{
      results: ApiCall[]
      total: number
      page: number
      pages: number
    }>(`/calls${q.size ? `?${q}` : ""}`)
  },
  start(receiverId: string, type: "voice" | "video") {
    return apiRequest<{
      call: { id: string; status: string; ratePerMinute: number }
    }>("/calls", { method: "POST", body: JSON.stringify({ receiverId, type }) })
  },
  answer(id: string) {
    return apiRequest<{ call: { id: string; status: string; startedAt: string } }>(
      `/calls/${encodeURIComponent(id)}/answer`,
      { method: "POST", body: JSON.stringify({}) },
    )
  },
  reject(id: string) {
    return apiRequest<{ rejected: boolean }>(
      `/calls/${encodeURIComponent(id)}/reject`,
      { method: "POST", body: JSON.stringify({}) },
    )
  },
  end(id: string) {
    return apiRequest<{ call: ApiCall }>(
      `/calls/${encodeURIComponent(id)}/end`,
      { method: "POST", body: JSON.stringify({}) },
    )
  },
}
