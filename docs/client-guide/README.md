# دليل العميل — نسخة الويب

دليل PDF مبسّط يشرح ميزات موقع **شريك العمر** ووظيفة كل جزء،
مع لقطات شاشة حقيقية من النسخة المنشورة.

- الملف الناتج: `../Sharik-Alomr-Web-Client-Guide.pdf`
- المصدر: `guide.html` + `guide.css`
- اللقطات: `assets/` — مأخوذة من production build للموقع
- الخطوط: `fonts/` — خط Alexandria

## إعادة توليد ملف الـ PDF

```bash
./build-pdf.sh
```

أو يدويًا عبر Chrome:

```bash
google-chrome --headless=new --no-sandbox --disable-gpu \
  --allow-file-access-from-files --no-pdf-header-footer \
  --virtual-time-budget=10000 \
  --print-to-pdf=../Sharik-Alomr-Web-Client-Guide.pdf \
  "file://$PWD/guide.html"
```

## ملاحظات

- الدليل من 19 صفحة بمقاس A4، وكل صفحة مستقلة بشرحها ولقطتها.
- أرقام الهواتف والبريد الإداري في اللقطات مُقنّعة (masked) قبل النشر.
- اللقطات تُحدَّث بإعادة التقاطها من نسخة production ثم استبدال
  الملفات داخل `assets/`.
