#!/usr/bin/env bash
# استعادة نسخة احتياطية إلى PostgreSQL.
# الاستخدام: ./deploy/restore.sh backups/sharik_alomr_YYYYmmdd_HHMMSS.sql.gz
# تحذير: تستبدل البيانات الحالية. تتطلب تأكيدًا صريحًا.
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ $# -ne 1 || ! -f "$1" ]]; then
  echo "الاستخدام: $0 backups/<file>.sql.gz" >&2
  exit 1
fi

# shellcheck disable=SC1091
set -a
source .env
set +a

DB_NAME="${POSTGRES_DB:-sharik_alomr}"
DB_USER="${POSTGRES_USER:-sharik}"
BACKUP="$1"

echo "سيتم استبدال قاعدة البيانات: ${DB_NAME}"
echo "الملف: ${BACKUP}"
read -r -p "اكتب اسم القاعدة للتأكيد: " CONFIRM
if [[ "${CONFIRM}" != "${DB_NAME}" ]]; then
  echo "تم الإلغاء." >&2
  exit 1
fi

echo "إيقاف الخدمات المعتمدة على قاعدة البيانات..."
docker compose stop bff web

echo "استعادة النسخة..."
gunzip -c "${BACKUP}" | docker compose exec -T db psql \
  --username "${DB_USER}" \
  --dbname "${DB_NAME}" \
  --set ON_ERROR_STOP=1

echo "إعادة تشغيل الخدمات..."
docker compose start bff web

echo "اكتملت الاستعادة. تحقق من /health ثم اختبر تسجيل الدخول."
