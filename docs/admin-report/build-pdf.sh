#!/usr/bin/env bash
# إعادة توليد ملف PDF لتقرير لوحة تحكم الإدارة من report.html
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
OUT="$DIR/../Sharik-Alomr-Admin-Dashboard-Report.pdf"

CHROME="${CHROME:-google-chrome}"

"$CHROME" \
  --headless=new \
  --no-sandbox \
  --disable-gpu \
  --allow-file-access-from-files \
  --no-pdf-header-footer \
  --virtual-time-budget=12000 \
  --print-to-pdf="$OUT" \
  "file://$DIR/report.html" 2>/dev/null

echo "تم إنشاء: $OUT"
