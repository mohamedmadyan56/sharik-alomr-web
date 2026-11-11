# Sharik Alomr Web BFF

باك-اند منفصل للويب، بيشتغل كـ BFF (Backend-for-Frontend) قدام Next.js، وبيستخدم **نفس قاعدة بيانات باك-اند الموبايل** `sharik_alomr_backend`.

- البورت الافتراضي: `4001`
- Next.js بيعمل proxy لـ `/api/bff/:path*` إلى `http://127.0.0.1:4001/api/:path*`
- كوكي الجلسة `httpOnly` و`SameSite=Lax`، والجلسات متخزّنة في جدول `web_sessions`
- أكواد OTP متخزّنة في جدول `web_otp_codes` — منفصلة تماماً عن جداول الموبايل
- كود التحقق **5 أرقام** زي الموبايل

## التشغيل

```bash
cd bff
npm install
cp .env.example .env
# عدّل DATABASE_URL و WEB_SESSION_SECRET
npx prisma generate
psql "$DATABASE_URL" -f prisma/web_tables.sql
npm run dev
```

للتشغيل الإنتاجي:

```bash
npm run build
npm start
```

وفي مشروع Next.js:

```bash
npm run dev
# أو
BFF_URL=http://127.0.0.1:4001 npm run build && npm start
```

## المتغيرات المهمة

| المتغير | الوصف |
| --- | --- |
| `DATABASE_URL` | نفس اتصال قاعدة بيانات الموبايل |
| `WEB_SESSION_SECRET` | سر توقيع/تجزئة جلسات الويب — 32 حرفاً على الأقل |
| `WEB_ORIGIN` | أصول الويب المسموحة، مفصولة بفواصل |
| `OTP_DEV_ECHO` | يرجّع `devCode` في الاستجابة للتطوير فقط |
| `OTP_SMS_PROVIDER` | `dev` أو `twilio` |
| `COOKIE_SECURE` | افتراضياً `true` في الإنتاج — يتطلب HTTPS |
| `GOOGLE_CLIENT_ID` | معرّف عميل OAuth (Web application) من Google Cloud Console |
| `GOOGLE_CLIENT_IDS` | اختياري: معرّفات إضافية مفصولة بفواصل |

> في الإنتاج: `OTP_DEV_ECHO=false`، و`OTP_SMS_PROVIDER=twilio` مع بيانات Twilio، واستخدم HTTPS.

## إعداد الدخول عبر Google

1. من [Google Cloud Console](https://console.cloud.google.com/apis/credentials) أنشئ **OAuth client ID** من نوع **Web application**.
2. أضف الأصول المسموحة في **Authorized JavaScript origins**:
   - `http://localhost:3000`
   - `http://127.0.0.1:3000`
   - أصل الإنتاج: `https://sharik-alomr.com`
3. ضع المعرّف في `GOOGLE_CLIENT_ID` داخل `bff/.env`.
4. أعد تشغيل الـ BFF.

الويب بيستخدم **Google Identity Services** في المتصفح لجلب access token، والـ BFF بيتحقق منه عبر
`https://oauth2.googleapis.com/tokeninfo` ويتأكد من `aud` و`sub` و`email_verified` قبل إنشاء الجلسة.
مفيش client secret مطلوب.

> لو ظهر `origin_mismatch` في نافذة جوجل، معناها إن أصل الموقع غير مضاف في Authorized JavaScript origins.

## المسارات

### الصحة

- `GET /health`
- `GET /api/health`

### المصادقة

- `POST /api/auth/register/start`
- `POST /api/auth/register/verify-otp`
- `PATCH /api/auth/register/profile-basics`
- `POST /api/auth/otp/login/start`
- `POST /api/auth/otp/login/verify`
- `POST /api/auth/login` (هاتف/بريد + كلمة مرور)
- `POST /api/auth/login/2fa/verify` (الخطوة الثانية عند تفعيلها)
- `POST /api/auth/login/2fa/resend`
- `GET /api/auth/google/config`
- `POST /api/auth/google` (access token من Google Identity Services)
- `POST /api/auth/password/forgot/start`
- `POST /api/auth/password/forgot/verify`
- `POST /api/auth/phone/change/start`
- `POST /api/auth/phone/change/verify`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `POST /api/auth/logout-all`
- `POST /api/auth/set-password`
- `POST /api/auth/change-password`

### التحقق بخطوتين

اختياري لكل مستخدم من إعدادات الأمان، ولا يُفعَّل افتراضيًا. عند تفعيله:

1. `POST /api/auth/login` أو `POST /api/auth/google` بيرجّع `twoFactorRequired: true` مع `challenge` موقّع قصير العمر، **بدون إنشاء جلسة**.
2. بيتبعت كود OTP لهاتف المستخدم الموثّق (purpose = `two_factor`).
3. `POST /api/auth/login/2fa/verify` بالـ `challenge` والكود ينشئ الجلسة.

تفعيله يتطلب رقم هاتف موثّقًا، وتغيير الرقم متاح من نفس شاشة الأمان عبر `phone/change/*`.

### الباقات

- `GET /api/subscriptions/plans?country=EG`

الباقات المدفوعة من جدول `subscription_plans` ومزاياها من `plan_features` + `feature_catalog`، مع بطاقة `free` تعريفية للويب. السعر السنوي = الشهري × 10.

### المقالات

- `GET /api/blog/categories`
- `GET /api/blog/articles?category=...&search=...&limit=20&before=...`
- `GET /api/blog/articles/:slugOrId`

المقالات من `blog_articles` — المنشور فقط (`status = published`).

### الإدارة

- `POST /api/admin/auth/login` (بريد إداري + كلمة مرور)
- `POST /api/admin/auth/2fa/verify` (كود TOTP بعد كلمة المرور عند تفعيله)
- `GET /api/admin/auth/2fa/status`
- `POST /api/admin/auth/2fa/setup` (سر TOTP مشفّر + `otpauth://` URI)
- `POST /api/admin/auth/2fa/enable`
- `POST /api/admin/auth/2fa/disable`
- `GET /api/admin/auth/me`
- `POST /api/admin/auth/logout`
- `POST /api/admin/auth/change-password`

التحقق بخطوتين للإدارة اختياري ويُفعَّل من شاشة «أمان الحساب» داخل لوحة التحكم.
يستخدم TOTP (RFC 6238): 6 أرقام، خطوة 30 ثانية، ونافذة تحقق ±30 ثانية.
السر يُخزَّن مشفّرًا بـ AES-256-GCM، والتحدي بين كلمة المرور والكود موقّع
وصالح 10 دقائق — ولا تُنشأ جلسة إدارية قبل إتمام الخطوة الثانية.
تفعيل أو إيقاف التحقق أو تغيير كلمة المرور ينهي الجلسات الإدارية الأخرى.

## شكل الاستجابة

```json
{
  "data": {},
  "meta": { "requestId": "...", "serverTime": "..." }
}
```

```json
{
  "error": { "code": "VALIDATION_ERROR", "message": "..." },
  "meta": { "requestId": "...", "serverTime": "..." }
}
```

## ملاحظات

- تسجيل الويب بينشئ المستخدم + المحفظة + إعدادات الخصوصية والإشعارات، وبيدّي هدية الترحيب من `app_settings.credits.welcome_bonus` (افتراضي 100).
- استكمال الملف والتعريف الكامل (onboarding) مرحلته الثانية.
- `credit_transactions` في قاعدة البيانات append-only، فأي تنظيف لبيانات اختبار لازم يتعمل بحذر وبعد تعطيل trigger مؤقتاً.
- لا ترفع `.env` على Git. الملف موجود في `.gitignore`.
