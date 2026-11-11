"use client";

/**
 * آخر خط دفاع: يعمل عندما يفشل الـ root layout أو الـ providers نفسها،
 * لذلك لا يعتمد على أي CSS أو context من التطبيق.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "40px 20px",
          background: "#f8f4f8",
          color: "#29212b",
          fontFamily: "system-ui, -apple-system, 'Segoe UI', Tahoma, sans-serif",
        }}
      >
        <main
          style={{
            width: "100%",
            maxWidth: 480,
            background: "#fff",
            border: "1px solid #eadbea",
            borderRadius: 22,
            padding: "34px 28px",
            textAlign: "center",
            boxShadow: "0 18px 60px rgba(64,20,56,.12)",
          }}
        >
          <div
            style={{
              fontWeight: 800,
              fontSize: 22,
              color: "#401438",
              marginBottom: 6,
            }}
          >
            شريك العمر
          </div>
          <div
            style={{
              fontSize: 40,
              fontWeight: 900,
              color: "#ce63cc",
              lineHeight: 1.1,
              margin: "12px 0",
            }}
            dir="ltr"
          >
            500
          </div>
          <h1 style={{ fontSize: 19, margin: "0 0 8px" }}>
            حصل خطأ غير متوقع
          </h1>
          <p style={{ fontSize: 13, lineHeight: 1.9, color: "#766c78" }}>
            تعذّر تحميل التطبيق. جرّب تحديث الصفحة، ولو المشكلة استمرت تواصل مع
            الدعم.
          </p>
          <p style={{ fontSize: 11, lineHeight: 1.8, color: "#766c78" }}>
            Something went wrong. Please reload the page.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 12,
              minHeight: 44,
              padding: "0 22px",
              border: 0,
              borderRadius: 12,
              background: "#401438",
              color: "#fff",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            إعادة المحاولة / Try again
          </button>
          {error.digest && (
            <div
              style={{
                marginTop: 14,
                fontSize: 10,
                color: "#a397a3",
              }}
              dir="ltr"
            >
              {error.digest}
            </div>
          )}
        </main>
      </body>
    </html>
  );
}
