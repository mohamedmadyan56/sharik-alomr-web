# نشر شريك العمر — دليل التشغيل الإنتاجي

هذا الدليل يغطي تشغيل المنصة على خادم Linux واحد باستخدام Docker Compose، مع PostgreSQL وNginx وHTTPS ونسخ احتياطي ومراقبة.

> **مهم:** لا تضع أي أسرار في Git. كل القيم الحساسة تُحفظ في `.env` على الخادم فقط، و`secrets/` مستثناة من Git.

---

## 1. المتطلبات

- خادم Ubuntu 22.04/24.04 بذاكرة 2GB على الأقل (4GB مستحسن).
- Docker Engine 26+ وDocker Compose v2.
- نطاق `sharik-alomr.com` (و`www`) يشير إلى عنوان الخادم.
- منافذ 80 و443 مفتوحة.
- حساب Twilio للرسائل، وبيانات Google OAuth، ومزوّد الدفع إن كان مفعّلًا.

```bash
sudo apt update && sudo apt install -y docker.io docker-compose-v2 git
sudo usermod -aG docker "$USER"
```

---

## 2. إعداد الأسرار

```bash
git clone <repo-url> /opt/sharik-alomr
cd /opt/sharik-alomr
cp .env.example .env
chmod 600 .env
```

املأ `.env` بالقيم الحقيقية. لتوليد الأسرار:

```bash
openssl rand -base64 48   # WEB_SESSION_SECRET
openssl rand -hex 32      # METRICS_TOKEN
openssl rand -base64 24   # POSTGRES_PASSWORD
```

أنشئ ملف توكن المقاييس الذي يقرأه Prometheus:

```bash
mkdir -p secrets
printf '%s' "$(grep '^METRICS_TOKEN=' .env | cut -d= -f2-)" > secrets/metrics-token
chmod 600 secrets/metrics-token
```

### متغيرات إلزامية

| المتغير | ملاحظات |
| --- | --- |
| `PUBLIC_URL` | يجب أن يبدأ بـ`https://` |
| `POSTGRES_PASSWORD` | كلمة مرور قوية |
| `WEB_SESSION_SECRET` | 32 حرفًا على الأقل |
| `OTP_SMS_PROVIDER` | `twilio` في الإنتاج |
| `TWILIO_*` | مطلوبة عند تفعيل Twilio |
| `PAYMENT_PROVIDER` | `manual` أو `stripe` أو `paymob` — `dev` مرفوض في الإنتاج |
| `METRICS_TOKEN` | لحماية `/metrics` |
| `GRAFANA_ADMIN_PASSWORD` | عند تشغيل المراقبة |
| `MEDIA_STORAGE` | `local` (volume دائم) أو `s3` (مستحسن) |
| `S3_*` | مطلوبة عند `MEDIA_STORAGE=s3` |

BFF يرفض بدء التشغيل إذا نقص أي إعداد إنتاجي، وهذا مقصود.

---

## 3. أول نشر

```bash
# 1) بناء الصور
docker compose build

# 2) تطبيق ترحيلات قاعدة البيانات
docker compose run --rm migrate

# 3) بيانات التأسيس: الصلاحيات والأدوار والباقات والمحتوى والإعدادات
docker compose run --rm seed

# 4) إنشاء حساب الإدارة الأول (مرة واحدة)
#    كلمة المرور تُولَّد تلقائيًا وتُحفظ في secrets/admin-bootstrap.txt،
#    أو مرّر ADMIN_BOOTSTRAP_PASSWORD في .env لاختيارها بنفسك.
docker compose run --rm seed-admin

# 5) تشغيل الخدمات
docker compose up -d
docker compose ps
```

> يجب تشغيل `seed` قبل `seed-admin`، لأن حساب الإدارة يحتاج دور `super_admin` الذي ينشئه الـ seed.

احفظ بيانات الإدارة الأولية في `secrets/admin-bootstrap.txt` على الخادم فقط، ثم غيّر كلمة المرور بعد أول دخول.

### قاعدة بيانات موجودة مسبقًا

إذا كانت قاعدة البيانات تحتوي جداول الويب بالفعل (طُبّقت سابقًا عبر `web_tables.sql`):

```bash
cd bff
npx prisma migrate resolve --applied 20261109_web_production
npx prisma migrate status   # يجب أن تكون كل الترحيلات مطبقة
```

أما قاعدة بيانات جديدة تمامًا فيكفي `docker compose run --rm migrate`.

---

## 3.1 تخزين الصور

- الافتراضي `MEDIA_STORAGE=local` ويُخزَّن داخل volume باسم `media_data` مربوط بـ`/app/uploads`، فلا تُفقد الصور عند إعادة بناء الحاوية.
- للإنتاج الموزّع أو النسخ الاحتياطي الخارجي، استخدم S3 أو MinIO:
  ```env
  MEDIA_STORAGE=s3
  S3_ENDPOINT=https://s3.example.com
  S3_REGION=us-east-1
  S3_BUCKET=sharik-media
  S3_ACCESS_KEY=...
  S3_SECRET_KEY=...
  S3_PUBLIC_BASE_URL=https://cdn.example.com
  ```
- الصور تُقدَّم عبر `/api/bff/media/file` مع تحقق من مفتاح التخزين، ولا يوجد مسار static مفتوح.
- نسخة `deploy/backup.sh` تشمل الوسائط المحلية تلقائيًا، لكن يُفضّل نسخ `backups/` إلى تخزين خارجي.

---

## 4. HTTPS

1. شغّل Nginx عبر HTTP أولًا (الملف `deploy/nginx/conf.d/sharik.conf`).
2. أصدر الشهادة:

```bash
docker compose run --rm --entrypoint certbot certbot certonly \
  --webroot -w /var/www/certbot \
  -d sharik-alomr.com -d www.sharik-alomr.com \
  --email ops@sharik-alomr.com --agree-tos --no-eff-email
```

3. انسخ الشهادة إلى المكان الذي يقرأه Nginx:

```bash
sudo mkdir -p deploy/certs
sudo cp /etc/letsencrypt/live/sharik-alomr.com/fullchain.pem deploy/certs/
sudo cp /etc/letsencrypt/live/sharik-alomr.com/privkey.pem deploy/certs/
sudo chmod 600 deploy/certs/privkey.pem
```

4. فعّل ملف SSL:

```bash
cp deploy/nginx/conf.d/ssl.conf.example deploy/nginx/conf.d/ssl.conf
docker compose exec nginx nginx -t
docker compose exec nginx nginx -s reload
```

5. تأكد أن `PUBLIC_URL=https://sharik-alomr.com` ثم أعد تشغيل BFF والويب.

### تجديد الشهادة

أضف مهمة cron شهرية:

```cron
0 3 1 * * cd /opt/sharik-alomr && docker compose run --rm --entrypoint certbot certbot renew --webroot -w /var/www/certbot && cp /etc/letsencrypt/live/sharik-alomr.com/*.pem deploy/certs/ && docker compose exec nginx nginx -s reload
```

---

## 5. النسخ الاحتياطي والاستعادة

### نسخة يدوية

```bash
./deploy/backup.sh 14
```

تُحفظ النسخ في `backups/` باسم `sharik_alomr_YYYYmmdd_HHMMSS.sql.gz`، ويُحذف الأقدم من 14 يومًا.

### نسخة يومية

```cron
30 2 * * * cd /opt/sharik-alomr && ./deploy/backup.sh 14 >> backups/backup.log 2>&1
```

### استعادة

```bash
./deploy/restore.sh backups/sharik_alomr_20261110_023000.sql.gz
```

الاستعادة توقف `bff` و`web` ثم تعيد تشغيلهما. اختبر `/health` وتسجيل الدخول بعدها.

> انسخ `backups/` دوريًا إلى تخزين خارجي (S3 أو خادم آخر). النسخة على نفس الخادم لا تحمي من فقدان الخادم.

---

## 6. المراقبة

```bash
docker compose --profile observability up -d prometheus grafana
```

- Grafana: `http://<server>:3000` غير مكشوف افتراضيًا. افتح نفق SSH:
  ```bash
  ssh -L 3001:127.0.0.1:3000 user@server
  docker compose --profile observability port grafana 3000
  ```
  أو أضف `ports: ["127.0.0.1:3001:3000"]` لخدمة Grafana.
- لوحة **Sharik Alomr — Web BFF** تُحمّل تلقائيًا.
- المقاييس تُقرأ من `/metrics` بتوكن `METRICS_TOKEN`.

### فحص سريع

```bash
curl -fsS https://sharik-alomr.com/api/bff/health
docker compose logs --tail=100 bff web nginx
```

---

## 7. التحديث والرجوع

```bash
git pull
docker compose build
docker compose run --rm migrate
docker compose up -d
```

- الترحيلات إضافية/idempotent، لكن خذ نسخة احتياطية قبل كل تحديث.
- للرجوع: أعد تشغيل الصورة السابقة (وسمها قبل التحديث):
  ```bash
  docker tag sharik-alomr-web sharik-alomr-web:previous
  docker tag sharik-alomr-bff sharik-alomr-bff:previous
  ```
  ثم `docker compose up -d` بعد تعديل الوسم أو استخدام `docker compose up -d --no-build` مع الصورة السابقة.

---

## 8. قائمة تحقق أمنية قبل الإطلاق

- [ ] `NODE_ENV=production` و`OTP_DEV_ECHO=false`.
- [ ] HTTPS يعمل وHTTP يحوّل إلى HTTPS.
- [ ] `COOKIE_SECURE=true` (مضبوط في Compose).
- [ ] `WEB_SESSION_SECRET` و`POSTGRES_PASSWORD` عشوائيان وقويان.
- [ ] `METRICS_TOKEN` مضبوط و`/metrics` غير متاح بدون توكن.
- [ ] حساب الإدارة الأول بكلمة مرور قوية، وتفعيل التحقق بخطوتين (TOTP) من شاشة «أمان الحساب» بعد أول دخول.
- [ ] نسخة احتياطية نُفّذت واستُعيدت بنجاح في بيئة اختبار.
- [ ] `PAYMENT_PROVIDER` ليس `dev`، ومفاتيح الدفع الحقيقية في `.env`.
- [ ] Google OAuth Authorized origins تحتوي نطاق الإنتاج فقط.
- [ ] Twilio يعمل ويصل OTP فعليًا.
- [ ] `robots.txt` و`sitemap.xml` يعملان.
- [ ] الصفحات القانونية (`/legal/*`) وموافقة الكوكيز ظاهرة.
- [ ] مراقبة Grafana تعمل وتنبيهات 5xx مفعّلة.
