-- CreateEnum
CREATE TYPE "VisionStatus" AS ENUM ('pending', 'approved', 'scheduled', 'completed', 'declined', 'cancelled');

-- CreateEnum
CREATE TYPE "VisionLocation" AS ENUM ('family_home', 'mosque', 'public_center', 'video_with_wali');

-- CreateEnum
CREATE TYPE "PrayerMethod" AS ENUM ('egyptian', 'mwl', 'isna', 'umm_al_qura', 'karachi');

-- CreateEnum
CREATE TYPE "AsrMethod" AS ENUM ('shafi', 'hanafi');

-- CreateEnum
CREATE TYPE "ConsultationStatus" AS ENUM ('confirmed', 'completed', 'cancelled_by_member', 'cancelled_by_sheikh', 'no_show');

-- CreateEnum
CREATE TYPE "ConsultationMeetingType" AS ENUM ('video', 'audio');

-- CreateEnum
CREATE TYPE "SheikhTxType" AS ENUM ('consultation_earning', 'payout', 'admin_adjust');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CreditTxType" ADD VALUE 'consultation_booking';
ALTER TYPE "CreditTxType" ADD VALUE 'consultation_refund';

-- AlterTable
ALTER TABLE "notification_settings" ADD COLUMN     "consultation" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "prayer" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "vision_requests" (
    "id" TEXT NOT NULL,
    "match_id" TEXT,
    "requester_id" TEXT NOT NULL,
    "recipient_id" TEXT NOT NULL,
    "status" "VisionStatus" NOT NULL DEFAULT 'pending',
    "preferred_at" TIMESTAMP(3),
    "location_type" "VisionLocation" NOT NULL DEFAULT 'family_home',
    "location_details" TEXT,
    "guardian_name" TEXT,
    "guardian_phone" TEXT,
    "notes" TEXT,
    "response_note" TEXT,
    "responded_at" TIMESTAMP(3),
    "scheduled_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vision_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prayer_settings" (
    "user_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "city" TEXT,
    "country" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Cairo',
    "method" "PrayerMethod" NOT NULL DEFAULT 'egyptian',
    "asr_method" "AsrMethod" NOT NULL DEFAULT 'shafi',
    "reminder_minutes_before" INTEGER NOT NULL DEFAULT 0,
    "fajr" BOOLEAN NOT NULL DEFAULT true,
    "dhuhr" BOOLEAN NOT NULL DEFAULT true,
    "asr" BOOLEAN NOT NULL DEFAULT true,
    "maghrib" BOOLEAN NOT NULL DEFAULT true,
    "isha" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prayer_settings_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "prayer_notification_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "prayer" TEXT NOT NULL,
    "local_date" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prayer_notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sheikh_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "bio" TEXT,
    "specialties" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "years_experience" INTEGER NOT NULL DEFAULT 0,
    "session_duration_minutes" INTEGER NOT NULL DEFAULT 30,
    "session_credits" INTEGER,
    "earning_egp_per_session" INTEGER,
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Cairo',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_verified" BOOLEAN NOT NULL DEFAULT true,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_sessions" INTEGER NOT NULL DEFAULT 0,
    "balance_egp" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sheikh_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sheikh_availability" (
    "id" TEXT NOT NULL,
    "sheikh_id" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "start_minute" INTEGER NOT NULL,
    "end_minute" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sheikh_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultations" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "sheikh_id" TEXT NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "duration_minutes" INTEGER NOT NULL DEFAULT 30,
    "status" "ConsultationStatus" NOT NULL DEFAULT 'confirmed',
    "meeting_type" "ConsultationMeetingType" NOT NULL DEFAULT 'video',
    "topic" TEXT,
    "notes" TEXT,
    "credits_charged" INTEGER NOT NULL,
    "sheikh_earning_egp" INTEGER NOT NULL,
    "credit_reference" TEXT,
    "cancelled_at" TIMESTAMP(3),
    "cancellation_reason" TEXT,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consultations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sheikh_transactions" (
    "id" TEXT NOT NULL,
    "sheikh_id" TEXT NOT NULL,
    "type" "SheikhTxType" NOT NULL,
    "amount_egp" INTEGER NOT NULL,
    "balance_before" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "consultation_id" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sheikh_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vision_requests_recipient_id_status_idx" ON "vision_requests"("recipient_id", "status");

-- CreateIndex
CREATE INDEX "vision_requests_requester_id_status_idx" ON "vision_requests"("requester_id", "status");

-- CreateIndex
CREATE INDEX "prayer_notification_logs_local_date_idx" ON "prayer_notification_logs"("local_date");

-- CreateIndex
CREATE UNIQUE INDEX "prayer_notification_logs_user_id_prayer_local_date_key" ON "prayer_notification_logs"("user_id", "prayer", "local_date");

-- CreateIndex
CREATE UNIQUE INDEX "sheikh_profiles_user_id_key" ON "sheikh_profiles"("user_id");

-- CreateIndex
CREATE INDEX "sheikh_profiles_is_active_idx" ON "sheikh_profiles"("is_active");

-- CreateIndex
CREATE INDEX "sheikh_availability_sheikh_id_weekday_idx" ON "sheikh_availability"("sheikh_id", "weekday");

-- CreateIndex
CREATE INDEX "consultations_member_id_scheduled_at_idx" ON "consultations"("member_id", "scheduled_at");

-- CreateIndex
CREATE INDEX "consultations_sheikh_id_scheduled_at_idx" ON "consultations"("sheikh_id", "scheduled_at");

-- CreateIndex
CREATE INDEX "consultations_status_scheduled_at_idx" ON "consultations"("status", "scheduled_at");

-- CreateIndex
CREATE UNIQUE INDEX "sheikh_transactions_consultation_id_key" ON "sheikh_transactions"("consultation_id");

-- CreateIndex
CREATE INDEX "sheikh_transactions_sheikh_id_created_at_idx" ON "sheikh_transactions"("sheikh_id", "created_at");

-- AddForeignKey
ALTER TABLE "vision_requests" ADD CONSTRAINT "vision_requests_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vision_requests" ADD CONSTRAINT "vision_requests_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vision_requests" ADD CONSTRAINT "vision_requests_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prayer_settings" ADD CONSTRAINT "prayer_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prayer_notification_logs" ADD CONSTRAINT "prayer_notification_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sheikh_profiles" ADD CONSTRAINT "sheikh_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sheikh_availability" ADD CONSTRAINT "sheikh_availability_sheikh_id_fkey" FOREIGN KEY ("sheikh_id") REFERENCES "sheikh_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_sheikh_id_fkey" FOREIGN KEY ("sheikh_id") REFERENCES "sheikh_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sheikh_transactions" ADD CONSTRAINT "sheikh_transactions_sheikh_id_fkey" FOREIGN KEY ("sheikh_id") REFERENCES "sheikh_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sheikh_transactions" ADD CONSTRAINT "sheikh_transactions_consultation_id_fkey" FOREIGN KEY ("consultation_id") REFERENCES "consultations"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- منع حجز نفس الموعد مرتين لنفس الشيخ (المواعيد الملغاة قابلة لإعادة الحجز)
CREATE UNIQUE INDEX "consultations_sheikh_scheduled_active_key" ON "consultations"("sheikh_id", "scheduled_at") WHERE "status" IN ('confirmed', 'completed');
