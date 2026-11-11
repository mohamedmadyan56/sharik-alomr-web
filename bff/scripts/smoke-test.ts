/**
 * اختبار دخان حقيقي ضد BFF — يستخدم تدفّق OTP الفعلي وليس استعلامات مباشرة.
 *
 * التشغيل:
 *   SMOKE_BASE_URL=http://127.0.0.1:4001 npm run smoke
 *
 * ملاحظة: يتطلب تشغيل BFF في بيئة تطوير يسمح بإرجاع devCode،
 * أو ضبط SMOKE_OTP_CODE يدويًا عند استخدام مزوّد SMS حقيقي.
 */
const BASE = (process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:4001').replace(/\/$/, '');
const PHONE = process.env.SMOKE_PHONE ?? '01099992777';
const PASSWORD = process.env.SMOKE_PASSWORD ?? 'TestPass123!';
const MANUAL_CODE = process.env.SMOKE_OTP_CODE;

type Envelope<T> = {
  data?: T;
  error?: { code?: string; message?: string; details?: unknown };
};

class HttpSession {
  private cookies = new Map<string, string>();

  async request<T = unknown>(
    path: string,
    init: RequestInit = {},
  ): Promise<{ status: number; body: Envelope<T> }> {
    const headers = new Headers(init.headers);
    headers.set('accept', 'application/json');
    if (init.body) headers.set('content-type', 'application/json');
    if (this.cookies.size > 0) {
      headers.set(
        'cookie',
        [...this.cookies.entries()].map(([name, value]) => `${name}=${value}`).join('; '),
      );
    }

    const response = await fetch(`${BASE}${path}`, { ...init, headers });
    const raw = await response.text();
    const body = (raw ? JSON.parse(raw) : {}) as Envelope<T>;

    const setCookies =
      typeof response.headers.getSetCookie === 'function'
        ? response.headers.getSetCookie()
        : [];
    for (const cookie of setCookies) {
      const [pair] = cookie.split(';');
      const index = pair.indexOf('=');
      if (index > 0) {
        this.cookies.set(pair.slice(0, index).trim(), pair.slice(index + 1).trim());
      }
    }

    return { status: response.status, body };
  }

  get<T>(path: string) {
    return this.request<T>(path);
  }

  post<T>(path: string, payload: unknown = {}) {
    return this.request<T>(path, { method: 'POST', body: JSON.stringify(payload) });
  }

  patch<T>(path: string, payload: unknown = {}) {
    return this.request<T>(path, { method: 'PATCH', body: JSON.stringify(payload) });
  }
}

const failures: string[] = [];
let passed = 0;

function check(name: string, condition: unknown, detail = ''): void {
  if (condition) {
    passed += 1;
    console.log(`[PASS] ${name}${detail ? ` — ${detail}` : ''}`);
    return;
  }
  failures.push(name);
  console.error(`[FAIL] ${name}${detail ? ` — ${detail}` : ''}`);
}

function dataOf<T>(
  result: { status: number; body: Envelope<T> },
  name: string,
): T | null {
  if (result.status >= 400 || result.body.error) {
    check(name, false, `${result.status} ${result.body.error?.message ?? 'unknown error'}`);
    return null;
  }
  return result.body.data ?? null;
}

const session = new HttpSession();

async function ensureAccount(): Promise<string | null> {
  const start = await session.post<{
    phone: string;
    devCode?: string;
    expiresInSeconds: number;
  }>('/api/auth/register/start', { phone: PHONE });

  if (start.status === 409) {
    const login = await session.post<{
      user: { id: string };
    }>('/api/auth/login', { identifier: PHONE, password: PASSWORD });
    const data = dataOf(login, 'login existing smoke account');
    return data?.user.id ?? null;
  }

  const started = dataOf(start, 'register smoke account');
  if (!started) return null;
  const code = MANUAL_CODE ?? started.devCode;
  if (!code) {
    check('OTP code available', false, 'set SMOKE_OTP_CODE or enable dev OTP echo');
    return null;
  }

  const verify = await session.post<{
    user: { id: string };
  }>('/api/auth/register/verify-otp', {
    phone: PHONE,
    code,
    firstName: 'اختبار',
    lastName: 'الدخان',
    password: PASSWORD,
  });
  const verified = dataOf(verify, 'verify smoke account');
  return verified?.user.id ?? null;
}

async function main(): Promise<void> {
  const health = await fetch(`${BASE}/health`);
  check('health endpoint', health.ok, String(health.status));

  const userId = await ensureAccount();
  if (!userId) {
    throw new Error('could not create or log in the smoke account');
  }
  check('authenticated user id', userId.length > 0, userId);

  const login = await session.post<{ user: { id: string } }>('/api/auth/login', {
    identifier: PHONE,
    password: PASSWORD,
  });
  const loginData = dataOf(login, 'password login');
  check('password login works', loginData?.user.id === userId);

  const me = dataOf(
    await session.get<{
      user: { id: string };
      profileCompletion: { percent: number; basicsComplete: boolean };
    }>('/api/auth/me'),
    'auth me',
  );
  check('auth me returns session user', me?.user.id === userId);
  check(
    'completion percentage is bounded',
    typeof me?.profileCompletion.percent === 'number' &&
      me.profileCompletion.percent >= 0 &&
      me.profileCompletion.percent <= 100,
    String(me?.profileCompletion.percent),
  );

  const profile = dataOf(
    await session.get<{ completion: { basicsComplete: boolean } }>('/api/profile'),
    'profile',
  );
  if (profile && !profile.completion.basicsComplete) {
    const onboarding = await session.post<{
      completion: { percent: number };
    }>('/api/profile/onboarding', {
      basics: {
        firstName: 'اختبار',
        lastName: 'الدخان',
        gender: 'male',
        dateOfBirth: '1992-03-10',
        country: 'EG',
        city: 'القاهرة',
      },
      details: {
        nationality: 'مصر',
        maritalStatus: 'single',
        education: 'bachelor',
        profession: 'مهندس اختبار',
        heightCm: 178,
        languages: ['العربية'],
        smoking: 'no',
        jobStability: 'stable',
      },
      marriage: {
        marriageIntent: 'serious_marriage',
        marriageTimeline: 'months_12',
        wantsChildren: 'yes',
        relocation: 'willing',
        livingPreference: 'independent_home',
        religion: 'مسلم',
      },
      about: {
        bio: 'حساب اختبار دخان للتأكد من سلامة رحلة المستخدم على المنصة.',
        interests: ['القراءة', 'التطوع', 'السفر'],
        personality: ['هادئ'],
        lifestyle: ['متوازن'],
      },
      preferences: { countries: ['EG'], ageMin: 25, ageMax: 35 },
      privacy: {
        profileVisibility: 'public',
        showOnlineStatus: true,
        hideLastSeen: false,
        cityOnlyLocation: true,
        searchable: true,
      },
      dealBreakerKeys: [],
      coreValueKeys: ['respect'],
    });
    const onboarded = dataOf<{ completion: { percent: number } }>(
      onboarding,
      'onboarding',
    );
    check(
      'onboarding completes basics',
      Boolean(onboarded && onboarded.completion.percent >= 70),
      String(onboarded?.completion.percent),
    );
  } else {
    check('profile already onboarded', true);
  }

  const search = dataOf<{ results: unknown[]; total: number }>(
    await session.get('/api/discovery/search?page=1&limit=5'),
    'discovery search',
  );
  check(
    'discovery search returns results',
    Boolean(search && Array.isArray(search.results) && search.results.length > 0),
    String(search?.results.length),
  );

  const dashboard = dataOf<{ counts: Record<string, number> }>(
    await session.get('/api/discovery/dashboard'),
    'discovery dashboard',
  );
  check('dashboard counts present', Boolean(dashboard?.counts));

  const favorites = dataOf<{ results: unknown[] }>(
    await session.get('/api/discovery/favorites'),
    'favorites list',
  );
  check('favorites list loads', Boolean(favorites && Array.isArray(favorites.results)));

  const wallet = dataOf<{ balance: number }>(
    await session.get('/api/wallet'),
    'wallet',
  );
  check('wallet loads', typeof wallet?.balance === 'number', String(wallet?.balance));

  const packages = dataOf<{ packages: unknown[] }>(
    await session.get('/api/wallet/packages'),
    'credit packages',
  );
  check('credit packages load', Boolean(packages && packages.packages.length > 0));

  const topics = dataOf<{ topics: unknown[] }>(
    await session.get('/api/community/topics'),
    'community topics',
  );
  check('community topics load', Boolean(topics && topics.topics.length > 0));

  const notifications = dataOf<{ results: unknown[]; unread: number }>(
    await session.get('/api/notifications?limit=10'),
    'notifications',
  );
  check(
    'notifications load',
    Boolean(notifications && Array.isArray(notifications.results)),
    `unread=${notifications?.unread}`,
  );

  const conversations = dataOf<{ results: unknown[] }>(
    await session.get('/api/messages/conversations'),
    'conversations',
  );
  check(
    'conversations load',
    Boolean(conversations && Array.isArray(conversations.results)),
  );

  const calls = dataOf<{ results: unknown[] }>(
    await session.get('/api/calls?limit=5'),
    'call history',
  );
  check('call history loads', Boolean(calls && Array.isArray(calls.results)));

  // ── التحقق بخطوتين: اختياري، ولا يُنشئ جلسة قبل إدخال الكود ──
  const twoFactorSession = new HttpSession();
  const enabled2fa = await session.patch<{
    notifications: { twoFactorEnabled: boolean };
  }>('/api/profile/notifications', { twoFactorEnabled: true });
  const enabled2faData = dataOf(enabled2fa, 'enable two-step verification');
  check(
    'two-step verification can be enabled',
    enabled2faData?.notifications.twoFactorEnabled === true,
  );

  const challenged = await twoFactorSession.post<{
    twoFactorRequired: boolean;
    challenge: string;
    devCode?: string;
  }>('/api/auth/login', { identifier: PHONE, password: PASSWORD });
  const challengeData = dataOf(challenged, 'password login with 2fa');
  check(
    'password login requires second factor',
    challengeData?.twoFactorRequired === true,
  );
  check('2fa challenge issued', Boolean(challengeData?.challenge));

  const beforeCode = await twoFactorSession.get('/api/auth/me');
  check('no session before 2fa code', beforeCode.status === 401);

  if (challengeData?.challenge && challengeData.devCode) {
    const verified2fa = await twoFactorSession.post<{ user: { id: string } }>(
      '/api/auth/login/2fa/verify',
      { challenge: challengeData.challenge, code: challengeData.devCode },
    );
    const verified2faData = dataOf(verified2fa, 'verify two-step code');
    check('two-step code creates session', verified2faData?.user.id === userId);
  } else {
    check(
      '2fa dev code available',
      false,
      'set SMOKE_OTP_CODE or enable dev OTP echo',
    );
  }

  const disabled2fa = await session.patch<{
    notifications: { twoFactorEnabled: boolean };
  }>('/api/profile/notifications', { twoFactorEnabled: false });
  const disabled2faData = dataOf(disabled2fa, 'disable two-step verification');
  check(
    'two-step verification can be disabled',
    disabled2faData?.notifications.twoFactorEnabled === false,
  );

  await twoFactorSession.post('/api/auth/logout');

  const logout = await session.post('/api/auth/logout');
  check('logout succeeds', logout.status < 400);

  const afterLogout = await session.get('/api/auth/me');
  check('session revoked after logout', afterLogout.status === 401);

  console.log(`\n${passed} checks passed, ${failures.length} failed.`);
  if (failures.length > 0) {
    console.error(`Failures: ${failures.join(', ')}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('[smoke] fatal:', error);
  process.exitCode = 1;
});
