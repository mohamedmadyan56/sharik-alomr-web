# شريك العمر — تطبيق الويب

واجهة الويب الرسمية لمشروع **شريك العمر**، مبنية بـ **Next.js 16 (App Router) + React 19 + Tailwind CSS 4**، ومعها **BFF** مستقل بـ **TypeScript + Express + Prisma** يتصل بنفس قاعدة بيانات تطبيق الموبايل (PostgreSQL).

## المكوّنات

| المسار | الوصف |
| --- | --- |
| `src/` | تطبيق Next.js: الصفحة الرئيسية، الباقات، المقالات، تسجيل الدخول، لوحة المستخدم، لوحة الإدارة |
| `bff/` | الـ Backend-for-Frontend على المنفذ `4001` — مصادقة OTP، جلسات، ملفات شخصية، محادثات، محفظة، إشعارات، إدارة |
| `deploy/` | إعدادات النشر: Nginx، SSL، النسخ الاحتياطي والاستعادة، Prometheus |
| `docs/` | تقارير الجاهزية الإنتاجية ولقطات الشاشة |
| `docker-compose.yml` | تشغيل الإنتاج: Postgres + BFF + Web + Nginx |
| `.github/workflows/` | CI (typecheck / tests / build) ونشر صور Docker إلى GHCR |

## المتطلبات

- Node.js 22
- npm 10+
- PostgreSQL 16 (أو Docker)

## التشغيل المحلي

### 1) الـ BFF

```bash
cd bff
npm ci
cp .env.example .env        # عدّل DATABASE_URL و WEB_SESSION_SECRET
npx prisma generate
psql "$DATABASE_URL" -f prisma/web_tables.sql
npm run dev                 # http://127.0.0.1:4001
```

### 2) تطبيق الويب

```bash
npm ci
cp .env.example .env.local  # عدّل القيم حسب بيئتك
npm run dev                 # http://127.0.0.1:3000
```

Next.js يمرّر الطلبات من `/api/bff/:path*` إلى `BFF_URL` (افتراضيًا `http://127.0.0.1:4001/api/:path*`).

## متغيرات البيئة

- `.env.example` — إعدادات الويب (`BFF_URL`, `SITE_URL`, ...)
- `bff/.env.example` — إعدادات الـ BFF (`DATABASE_URL`, `WEB_SESSION_SECRET`, `OTP_SMS_PROVIDER`, `GOOGLE_CLIENT_ID`, ...)

> لا تُرفع ملفات `.env` أو `secrets/` إلى المستودع. القيم الحقيقية تُدار على السيرفر فقط.

## الفحوصات

```bash
# الويب
npx tsc --noEmit
npm run build

# الـ BFF
cd bff
npx prisma generate
npx tsc --noEmit
npm test
npm run build
```

## النشر بـ Docker

```bash
cp .env.example .env
# اضبط POSTGRES_PASSWORD وباقي الأسرار
docker compose up -d --build
```

دليل النشر الكامل (HTTPS، النسخ الاحتياطي، المراقبة، قائمة التحقق الأمنية) في [`deploy/README.md`](deploy/README.md).

## التوثيق

- [`bff/README.md`](bff/README.md) — مسارات الـ API والمصادقة
- [`deploy/README.md`](deploy/README.md) — التشغيل الإنتاجي
- [`docs/`](docs/) — تقرير الجاهزية الإنتاجية

## الترخيص

مشروع خاص — جميع الحقوق محفوظة.
