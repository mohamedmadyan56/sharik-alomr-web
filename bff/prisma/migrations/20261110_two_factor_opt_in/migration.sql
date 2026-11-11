-- التحقق بخطوتين أصبح اختياريًا وفعليًا: لا يُفعَّل تلقائيًا لأي حساب.
-- إعادة ضبط القيم القديمة يمنع قفل المستخدمين الحاليين خارج حساباتهم.
ALTER TABLE "notification_settings"
  ALTER COLUMN "two_factor_enabled" SET DEFAULT false;

UPDATE "notification_settings"
SET "two_factor_enabled" = false
WHERE "two_factor_enabled" = true;
