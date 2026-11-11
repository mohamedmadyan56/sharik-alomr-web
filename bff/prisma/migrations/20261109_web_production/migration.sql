-- ============================================================
--  Web BFF production hardening — idempotent migration
--  يعمل على قاعدة موجودة مسبقًا دون فقدان بيانات.
-- ============================================================

-- جلسات الويب
CREATE TABLE IF NOT EXISTS web_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  user_agent TEXT,
  ip_address TEXT,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP(3) NOT NULL
);
CREATE INDEX IF NOT EXISTS web_sessions_user_id_idx ON web_sessions(user_id);
CREATE INDEX IF NOT EXISTS web_sessions_expires_at_idx ON web_sessions(expires_at);

-- أكواد OTP للويب + ربط اختياري بالمستخدم (لتغيير الهاتف بأمان)
CREATE TABLE IF NOT EXISTS web_otp_codes (
  id TEXT PRIMARY KEY,
  phone TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'login',
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMP(3) NOT NULL,
  resend_after TIMESTAMP(3) NOT NULL,
  consumed_at TIMESTAMP(3),
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE web_otp_codes ADD COLUMN IF NOT EXISTS user_id TEXT;
CREATE INDEX IF NOT EXISTS web_otp_codes_phone_purpose_created_at_idx
  ON web_otp_codes(phone, purpose, created_at);
CREATE INDEX IF NOT EXISTS web_otp_codes_user_id_purpose_created_at_idx
  ON web_otp_codes(user_id, purpose, created_at);
CREATE INDEX IF NOT EXISTS web_otp_codes_expires_at_idx ON web_otp_codes(expires_at);

-- حدود معدّل مشتركة بين نسخ الخدمة
CREATE TABLE IF NOT EXISTS web_rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  reset_at TIMESTAMP(3) NOT NULL,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS web_rate_limits_reset_at_idx ON web_rate_limits(reset_at);

-- جلسات الإدارة: منع تكرار التوكن + فهارس البحث
CREATE UNIQUE INDEX IF NOT EXISTS admin_sessions_token_hash_key ON admin_sessions(token_hash);
CREATE INDEX IF NOT EXISTS admin_sessions_expires_at_idx ON admin_sessions(expires_at);
