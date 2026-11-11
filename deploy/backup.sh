#!/usr/bin/env bash
# نسخة احتياطية يومية من PostgreSQL — تُشغّل من جذر المشروع.
# الاستخدام: ./deploy/backup.sh [نسخة_احتفاظ_بالأيام]
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
  echo "ملف .env غير موجود — لا يمكن قراءة بيانات قاعدة البيانات." >&2
  exit 1
fi

# shellcheck disable=SC1091
set -a
source .env
set +a

RETENTION_DAYS="${1:-14}"
STAMP="$(date -u +%Y%m%d_%H%M%S)"
DB_NAME="${POSTGRES_DB:-sharik_alomr}"
DB_USER="${POSTGRES_USER:-sharik}"
mkdir -p backups
OUT="backups/${DB_NAME}_${STAMP}.sql.gz"

echo "بدء النسخة الاحتياطية: ${OUT}"
docker compose exec -T db pg_dump \
  --username "${DB_USER}" \
  --dbname "${DB_NAME}" \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  | gzip -9 > "${OUT}.partial"

mv "${OUT}.partial" "${OUT}"

if [[ ! -s "${OUT}" ]]; then
  echo "فشل إنشاء النسخة: الملف فارغ." >&2
  exit 1
fi

SIZE="$(du -h "${OUT}" | cut -f1)"
echo "تم إنشاء النسخة (${SIZE})."

find backups -type f -name "${DB_NAME}_*.sql.gz" -mtime "+${RETENTION_DAYS}" -print -delete

# نسخة احتياطية من وسائط التخزين المحلي إن كان مستخدمًا.
MEDIA_OUT="backups/${DB_NAME}_media_${STAMP}.tar.gz"
if docker compose ps bff >/dev/null 2>&1; then
  if docker compose exec -T bff sh -c "test -d /app/uploads" >/dev/null 2>&1; then
    echo "بدء نسخة الوسائط: ${MEDIA_OUT}"
    docker compose exec -T bff tar czf - -C /app/uploads . > "${MEDIA_OUT}.partial" || true
    if [[ -s "${MEDIA_OUT}.partial" ]]; then
      mv "${MEDIA_OUT}.partial" "${MEDIA_OUT}"
      echo "تم إنشاء نسخة الوسائط ($(du -h "${MEDIA_OUT}" | cut -f1))."
    else
      rm -f "${MEDIA_OUT}.partial"
      echo "لا توجد وسائط محلية لنسخها (قد يكون S3 مستخدمًا)."
    fi
  fi
fi

find backups -type f -name "${DB_NAME}_media_*.tar.gz" -mtime "+${RETENTION_DAYS}" -print -delete

echo "تنظيف النسخ الأقدم من ${RETENTION_DAYS} يومًا اكتمل."
