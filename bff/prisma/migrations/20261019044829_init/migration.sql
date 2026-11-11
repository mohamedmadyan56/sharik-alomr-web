-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('active', 'suspended', 'banned', 'deleted');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('unverified', 'pending', 'verified', 'rejected');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('male', 'female');

-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('register', 'login', 'change_phone', 'two_factor');

-- CreateEnum
CREATE TYPE "SocialProvider" AS ENUM ('google', 'apple', 'facebook');

-- CreateEnum
CREATE TYPE "AdminStatus" AS ENUM ('active', 'suspended');

-- CreateEnum
CREATE TYPE "PermissionAccess" AS ENUM ('full', 'partial', 'none', 'deny');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "FraudSignalType" AS ENUM ('vpn', 'proxy', 'mock_location', 'emulator', 'duplicate_identity', 'multiple_account', 'device_integrity', 'ip_risk');

-- CreateEnum
CREATE TYPE "MaritalStatus" AS ENUM ('single', 'divorced', 'widowed');

-- CreateEnum
CREATE TYPE "Education" AS ENUM ('high_school', 'bachelor', 'master', 'phd', 'other');

-- CreateEnum
CREATE TYPE "SmokingStatus" AS ENUM ('no', 'yes', 'sometimes');

-- CreateEnum
CREATE TYPE "JobStability" AS ENUM ('stable', 'unstable');

-- CreateEnum
CREATE TYPE "MarriageIntent" AS ENUM ('serious_marriage', 'dating_first', 'matchmaking_for_other');

-- CreateEnum
CREATE TYPE "MarriageTimeline" AS ENUM ('m6', 'months_6', 'months_12', 'months_24', 'unspecified');

-- CreateEnum
CREATE TYPE "WantsChildren" AS ENUM ('yes', 'no', 'undecided');

-- CreateEnum
CREATE TYPE "Relocation" AS ENUM ('willing', 'unwilling', 'conditional');

-- CreateEnum
CREATE TYPE "LivingPreference" AS ENUM ('independent_home', 'family_home', 'unspecified');

-- CreateEnum
CREATE TYPE "PhotoCategory" AS ENUM ('public', 'private', 'one_time', 'temporary');

-- CreateEnum
CREATE TYPE "PhotoStatus" AS ENUM ('active', 'removed');

-- CreateEnum
CREATE TYPE "PhotoRequestStatus" AS ENUM ('pending', 'accepted', 'rejected', 'expired');

-- CreateEnum
CREATE TYPE "VerificationPipelineStatus" AS ENUM ('draft', 'pending', 'processing', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "VerificationStep" AS ENUM ('upload', 'liveness', 'human_review', 'activation');

-- CreateEnum
CREATE TYPE "VerificationStepStatus" AS ENUM ('done', 'in_progress', 'pending');

-- CreateEnum
CREATE TYPE "RecommendationStatus" AS ENUM ('new', 'viewed', 'consumed', 'removed');

-- CreateEnum
CREATE TYPE "LikeAction" AS ENUM ('like', 'pass', 'favorite', 'serious_interest');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('active', 'unmatched', 'ended');

-- CreateEnum
CREATE TYPE "ConversationType" AS ENUM ('direct', 'group_with_wali');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('active', 'archived', 'deleted');

-- CreateEnum
CREATE TYPE "ParticipantRole" AS ENUM ('member', 'wali', 'invited');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('text', 'voice', 'image', 'view_once', 'system');

-- CreateEnum
CREATE TYPE "AttachmentKind" AS ENUM ('image', 'voice', 'file');

-- CreateEnum
CREATE TYPE "MessageRequestStatus" AS ENUM ('pending', 'accepted', 'ignored');

-- CreateEnum
CREATE TYPE "CallType" AS ENUM ('voice', 'video');

-- CreateEnum
CREATE TYPE "CallStatus" AS ENUM ('ringing', 'active', 'completed', 'missed', 'failed', 'rejected');

-- CreateEnum
CREATE TYPE "CallEventType" AS ENUM ('ring', 'answer', 'hold', 'mute', 'record_start', 'record_stop', 'end');

-- CreateEnum
CREATE TYPE "WaliRelation" AS ENUM ('father', 'older_brother', 'paternal_uncle', 'maternal_uncle', 'other');

-- CreateEnum
CREATE TYPE "WaliLinkStatus" AS ENUM ('active', 'pending', 'revoked');

-- CreateEnum
CREATE TYPE "WaliInvitationStatus" AS ENUM ('pending', 'accepted', 'expired', 'revoked');

-- CreateEnum
CREATE TYPE "PostVisibility" AS ENUM ('public', 'followers', 'private');

-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('draft', 'published', 'removed', 'pending_review');

-- CreateEnum
CREATE TYPE "PostReactionKind" AS ENUM ('like', 'bookmark');

-- CreateEnum
CREATE TYPE "ArticleStatus" AS ENUM ('draft', 'scheduled', 'published');

-- CreateEnum
CREATE TYPE "BlogReactionKind" AS ENUM ('like', 'bookmark', 'helpful', 'not_helpful');

-- CreateEnum
CREATE TYPE "ReportTargetType" AS ENUM ('user', 'post', 'comment', 'message', 'call', 'photo', 'article');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('open', 'reviewing', 'resolved', 'dismissed');

-- CreateEnum
CREATE TYPE "ModerationAction" AS ENUM ('warn', 'suspend', 'ban', 'remove', 'restore');

-- CreateEnum
CREATE TYPE "CreditTxType" AS ENUM ('purchase', 'welcome_bonus', 'video_call', 'voice_call', 'boost', 'serious_interest', 'ai_recommendation', 'premium_recommendation', 'top_profile', 'admin_adjust', 'refund_never');

-- CreateEnum
CREATE TYPE "CostUnit" AS ENUM ('one_time', 'per_minute', 'per_day');

-- CreateEnum
CREATE TYPE "AccessMode" AS ENUM ('free', 'subscription_only', 'credits_only', 'subscription_or_credits', 'subscription_and_credits');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('active', 'expired', 'cancelled', 'pending');

-- CreateEnum
CREATE TYPE "PaymentPurpose" AS ENUM ('credit_package', 'subscription');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('card', 'apple_pay', 'google_pay', 'paypal', 'vodafone_cash', 'instapay', 'stripe');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'succeeded', 'failed', 'refunded_never');

-- CreateEnum
CREATE TYPE "MarketStatus" AS ENUM ('enabled', 'testing', 'disabled');

-- CreateEnum
CREATE TYPE "LimitBehavior" AS ENUM ('likes', 'ai_recommendations', 'top_profiles', 'new_messages', 'private_photos', 'verification_requests');

-- CreateEnum
CREATE TYPE "LimitWindow" AS ENUM ('day', 'week');

-- CreateEnum
CREATE TYPE "BoostStatus" AS ENUM ('active', 'expired');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('push', 'email', 'both');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "country_code" TEXT NOT NULL DEFAULT '+20',
    "email" TEXT,
    "password_hash" TEXT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT,
    "gender" "Gender",
    "date_of_birth" DATE,
    "account_status" "AccountStatus" NOT NULL DEFAULT 'active',
    "verification" "VerificationStatus" NOT NULL DEFAULT 'unverified',
    "is_verified_badge" BOOLEAN NOT NULL DEFAULT false,
    "profile_quality" INTEGER NOT NULL DEFAULT 0,
    "risk_score" INTEGER NOT NULL DEFAULT 0,
    "verification_available" BOOLEAN NOT NULL DEFAULT true,
    "country" TEXT,
    "city" TEXT,
    "phone_verified_at" TIMESTAMP(3),
    "email_verified_at" TIMESTAMP(3),
    "last_active_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_devices" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "fingerprint" TEXT,
    "model" TEXT,
    "os_version" TEXT,
    "build" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "first_login_at" TIMESTAMP(3),
    "last_active_at" TIMESTAMP(3),
    "ip_address" TEXT,
    "city" TEXT,
    "country" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "device_id" TEXT,
    "refresh_token_hash" TEXT NOT NULL,
    "remember_me" BOOLEAN NOT NULL DEFAULT false,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_codes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "phone" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "purpose" "OtpPurpose" NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "resend_after" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" "SocialProvider" NOT NULL,
    "provider_uid" TEXT NOT NULL,
    "email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_attempts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,
    "ip_address" TEXT,
    "device_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_resets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_resets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_scores" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "level" "RiskLevel" NOT NULL DEFAULT 'low',
    "reasons" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "risk_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fraud_signals" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "signal" "FraudSignalType" NOT NULL,
    "value" TEXT,
    "severity" INTEGER NOT NULL DEFAULT 50,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fraud_signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocked_users" (
    "id" TEXT NOT NULL,
    "blocker_id" TEXT NOT NULL,
    "blocked_id" TEXT NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocked_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "user_id" TEXT NOT NULL,
    "nationality" TEXT,
    "marital_status" "MaritalStatus",
    "has_children" BOOLEAN NOT NULL DEFAULT false,
    "children_count" INTEGER NOT NULL DEFAULT 0,
    "height_cm" INTEGER,
    "education" "Education",
    "university" TEXT,
    "profession" TEXT,
    "income_range" TEXT,
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "smoking" "SmokingStatus",
    "smoking_type" TEXT,
    "weight_health" TEXT,
    "job_stability" "JobStability",
    "legal_record" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "profile_marriage" (
    "user_id" TEXT NOT NULL,
    "marriage_intent" "MarriageIntent",
    "marriage_timeline" "MarriageTimeline",
    "wants_children" "WantsChildren",
    "children_planned" TEXT,
    "relocation" "Relocation",
    "living_preference" "LivingPreference",
    "religion" TEXT,
    "sect" TEXT,
    "family_prefs" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "profile_marriage_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "profile_about" (
    "user_id" TEXT NOT NULL,
    "bio" TEXT,
    "interests" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "personality" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lifestyle" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "looking_for" TEXT,

    CONSTRAINT "profile_about_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "profile_photos" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "category" "PhotoCategory" NOT NULL DEFAULT 'public',
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "watermarked" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMP(3),
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "status" "PhotoStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photo_access_requests" (
    "id" TEXT NOT NULL,
    "photo_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "requester_id" TEXT NOT NULL,
    "status" "PhotoRequestStatus" NOT NULL DEFAULT 'pending',
    "ttl_seconds" INTEGER NOT NULL DEFAULT 86400,
    "accepted_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "photo_access_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_locations" (
    "user_id" TEXT NOT NULL,
    "country" TEXT,
    "city" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "confidence_score" INTEGER NOT NULL DEFAULT 0,
    "sources_json" JSONB NOT NULL DEFAULT '{}',
    "is_suspicious" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_locations_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "user_id" TEXT NOT NULL,
    "countries" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "age_min" INTEGER,
    "age_max" INTEGER,
    "height_min" INTEGER,
    "height_max" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "preference_weights" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "criterion" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 3,

    CONSTRAINT "preference_weights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core_values" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label_ar" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "core_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_core_values" (
    "user_id" TEXT NOT NULL,
    "value_id" TEXT NOT NULL,

    CONSTRAINT "user_core_values_pkey" PRIMARY KEY ("user_id","value_id")
);

-- CreateTable
CREATE TABLE "deal_breaker_catalog" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label_ar" TEXT NOT NULL,
    "description_ar" TEXT,
    "icon" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "deal_breaker_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deal_breakers" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "breaker_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deal_breakers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "privacy_settings" (
    "user_id" TEXT NOT NULL,
    "profile_visibility" TEXT NOT NULL DEFAULT 'public',
    "show_online_status" BOOLEAN NOT NULL DEFAULT true,
    "hide_last_seen" BOOLEAN NOT NULL DEFAULT false,
    "city_only_location" BOOLEAN NOT NULL DEFAULT true,
    "searchable" BOOLEAN NOT NULL DEFAULT true,
    "private_photos_need_approval" BOOLEAN NOT NULL DEFAULT true,
    "temporary_photos_ttl_days" INTEGER NOT NULL DEFAULT 7,
    "watermark_photos" BOOLEAN NOT NULL DEFAULT true,
    "data_export_requested_at" TIMESTAMP(3),

    CONSTRAINT "privacy_settings_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "notification_settings" (
    "user_id" TEXT NOT NULL,
    "match" BOOLEAN NOT NULL DEFAULT true,
    "messages" BOOLEAN NOT NULL DEFAULT true,
    "calls" BOOLEAN NOT NULL DEFAULT true,
    "community" BOOLEAN NOT NULL DEFAULT true,
    "email_weekly" BOOLEAN NOT NULL DEFAULT false,
    "new_login_alerts" BOOLEAN NOT NULL DEFAULT true,
    "two_factor_enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "notification_settings_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "verification_requests" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "VerificationPipelineStatus" NOT NULL DEFAULT 'draft',
    "liveness_score" DOUBLE PRECISION,
    "face_match" DOUBLE PRECISION,
    "rejection_reasons" JSONB NOT NULL DEFAULT '[]',
    "review_sla_hours" INTEGER NOT NULL DEFAULT 6,
    "submitted_at" TIMESTAMP(3),
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_steps" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "step" "VerificationStep" NOT NULL,
    "status" "VerificationStepStatus" NOT NULL DEFAULT 'pending',
    "detail" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "liveness_checks" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "request_id" TEXT,
    "provider" TEXT NOT NULL,
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "confidence" DOUBLE PRECISION,
    "anti_spoof_passed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "liveness_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity_documents" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "doc_number_masked" TEXT,
    "name_matched" BOOLEAN NOT NULL DEFAULT false,
    "address_verified" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "identity_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendation_runs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "run_date" DATE NOT NULL,
    "quota" INTEGER NOT NULL DEFAULT 20,
    "used" INTEGER NOT NULL DEFAULT 0,
    "tier" TEXT,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recommendation_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendations" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "match_score" INTEGER NOT NULL DEFAULT 0,
    "reasons_positive" JSONB NOT NULL DEFAULT '[]',
    "reasons_negative" JSONB NOT NULL DEFAULT '[]',
    "factors" JSONB NOT NULL DEFAULT '{}',
    "is_paid" BOOLEAN NOT NULL DEFAULT false,
    "cost_credits" INTEGER NOT NULL DEFAULT 0,
    "status" "RecommendationStatus" NOT NULL DEFAULT 'new',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_views" (
    "id" TEXT NOT NULL,
    "viewer_id" TEXT NOT NULL,
    "viewed_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "top_profile_views" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "cost_credits" INTEGER NOT NULL DEFAULT 0,
    "viewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "top_profile_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "likes" (
    "id" TEXT NOT NULL,
    "from_user_id" TEXT NOT NULL,
    "to_user_id" TEXT NOT NULL,
    "action" "LikeAction" NOT NULL,
    "cost_credits" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" TEXT NOT NULL,
    "user_a" TEXT NOT NULL,
    "user_b" TEXT NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'active',
    "matched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unmatched_at" TIMESTAMP(3),
    "unmatched_by" TEXT,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorites" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "filter_presets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "filter_presets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "match_id" TEXT,
    "type" "ConversationType" NOT NULL DEFAULT 'direct',
    "status" "ConversationStatus" NOT NULL DEFAULT 'active',
    "last_message_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_participants" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "ParticipantRole" NOT NULL DEFAULT 'member',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMP(3),

    CONSTRAINT "conversation_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "type" "MessageType" NOT NULL DEFAULT 'text',
    "body" TEXT,
    "is_request" BOOLEAN NOT NULL DEFAULT false,
    "view_once_ttl_seconds" INTEGER NOT NULL DEFAULT 30,
    "opened_at" TIMESTAMP(3),
    "moderation" JSONB NOT NULL DEFAULT '{}',
    "reply_to" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_attachments" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "kind" "AttachmentKind" NOT NULL,
    "url" TEXT NOT NULL,
    "duration_seconds" INTEGER,
    "wave" JSONB,

    CONSTRAINT "message_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_receipts" (
    "messageId" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_receipts_pkey" PRIMARY KEY ("messageId","user_id")
);

-- CreateTable
CREATE TABLE "message_requests" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "from_user_id" TEXT NOT NULL,
    "status" "MessageRequestStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calls" (
    "id" TEXT NOT NULL,
    "caller_id" TEXT NOT NULL,
    "receiver_id" TEXT NOT NULL,
    "type" "CallType" NOT NULL,
    "status" "CallStatus" NOT NULL DEFAULT 'ringing',
    "rate_per_minute" INTEGER NOT NULL DEFAULT 20,
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "duration_seconds" INTEGER NOT NULL DEFAULT 0,
    "credits_consumed" INTEGER NOT NULL DEFAULT 0,
    "is_recorded" BOOLEAN NOT NULL DEFAULT false,
    "peer_notified_of_recording" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "call_events" (
    "id" TEXT NOT NULL,
    "call_id" TEXT NOT NULL,
    "event" "CallEventType" NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "call_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "walis" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "name" TEXT NOT NULL,
    "relation" "WaliRelation" NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "walis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wali_links" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "wali_id" TEXT NOT NULL,
    "status" "WaliLinkStatus" NOT NULL DEFAULT 'pending',
    "linked_since" TIMESTAMP(3),
    "shared_conversations_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "wali_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wali_invitations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "wali_id" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "status" "WaliInvitationStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wali_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wali_permissions" (
    "wali_link_id" TEXT NOT NULL,
    "view_matched_candidates" BOOLEAN NOT NULL DEFAULT true,
    "view_verification_status" BOOLEAN NOT NULL DEFAULT true,
    "join_group_chats" BOOLEAN NOT NULL DEFAULT true,
    "read_direct_chats" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "wali_permissions_pkey" PRIMARY KEY ("wali_link_id")
);

-- CreateTable
CREATE TABLE "community_topics" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name_ar" TEXT NOT NULL,
    "icon" TEXT,
    "is_followable" BOOLEAN NOT NULL DEFAULT true,
    "is_seasonal" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topic_follows" (
    "user_id" TEXT NOT NULL,
    "topic_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "topic_follows_pkey" PRIMARY KEY ("user_id","topic_id")
);

-- CreateTable
CREATE TABLE "posts" (
    "id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "topic_id" TEXT,
    "body" TEXT NOT NULL,
    "media_count" INTEGER NOT NULL DEFAULT 0,
    "visibility" "PostVisibility" NOT NULL DEFAULT 'public',
    "status" "PostStatus" NOT NULL DEFAULT 'published',
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "moderation" JSONB NOT NULL DEFAULT '{}',
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "comment_count" INTEGER NOT NULL DEFAULT 0,
    "bookmark_count" INTEGER NOT NULL DEFAULT 0,
    "share_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMP(3),

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_media" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "post_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_tags" (
    "post_id" TEXT NOT NULL,
    "tag" TEXT NOT NULL,

    CONSTRAINT "post_tags_pkey" PRIMARY KEY ("post_id","tag")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" TEXT NOT NULL,
    "post_id" TEXT,
    "article_id" TEXT,
    "author_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "body" TEXT NOT NULL,
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'published',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_reactions" (
    "user_id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "kind" "PostReactionKind" NOT NULL,

    CONSTRAINT "post_reactions_pkey" PRIMARY KEY ("user_id","post_id","kind")
);

-- CreateTable
CREATE TABLE "blog_categories" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name_ar" TEXT NOT NULL,

    CONSTRAINT "blog_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_articles" (
    "id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "category_id" TEXT,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT,
    "body" TEXT NOT NULL,
    "cover_url" TEXT,
    "read_time_minutes" INTEGER NOT NULL DEFAULT 3,
    "seo_title" TEXT,
    "meta_description" TEXT,
    "status" "ArticleStatus" NOT NULL DEFAULT 'draft',
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "views" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "helpful_count" INTEGER NOT NULL DEFAULT 0,
    "not_helpful_count" INTEGER NOT NULL DEFAULT 0,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blog_articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_article_reactions" (
    "user_id" TEXT NOT NULL,
    "article_id" TEXT NOT NULL,
    "kind" "BlogReactionKind" NOT NULL,

    CONSTRAINT "blog_article_reactions_pkey" PRIMARY KEY ("user_id","article_id","kind")
);

-- CreateTable
CREATE TABLE "report_reasons" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label_ar" TEXT NOT NULL,
    "description_ar" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "report_reasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "reporter_id" TEXT NOT NULL,
    "target_type" "ReportTargetType" NOT NULL,
    "target_id" TEXT NOT NULL,
    "reason_id" TEXT,
    "details" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'open',
    "sla_hours" INTEGER NOT NULL DEFAULT 24,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    "resolved_by" TEXT,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moderation_actions" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "action" "ModerationAction" NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moderation_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "banned_words" (
    "id" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "severity" INTEGER NOT NULL DEFAULT 50,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "banned_words_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "user_id" TEXT NOT NULL,
    "balance_credits" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "credit_transactions" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "CreditTxType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balance_before" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "related_id" TEXT,
    "description" TEXT,
    "provider_ref" TEXT,
    "card_last4" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_packages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "base_credits" INTEGER NOT NULL,
    "bonus_credits" INTEGER NOT NULL DEFAULT 0,
    "price_amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "old_price_amount" INTEGER,
    "country" TEXT,
    "badge" TEXT,
    "ribbon" TEXT,
    "is_popular" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "credit_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_catalog" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name_ar" TEXT NOT NULL,
    "description_ar" TEXT,
    "is_free" BOOLEAN NOT NULL DEFAULT false,
    "credit_cost" INTEGER NOT NULL DEFAULT 0,
    "cost_unit" "CostUnit" NOT NULL DEFAULT 'one_time',
    "daily_limit" INTEGER,
    "monthly_limit" INTEGER,
    "plan_required" TEXT,
    "countries" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "feature_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_access_rules" (
    "id" TEXT NOT NULL,
    "feature_id" TEXT NOT NULL,
    "access_mode" "AccessMode" NOT NULL DEFAULT 'credits_only',

    CONSTRAINT "feature_access_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "duration_days" INTEGER NOT NULL,
    "price_amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "country" TEXT,
    "cycle" TEXT NOT NULL DEFAULT 'monthly',
    "description_ar" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "auto_renew_default" BOOLEAN NOT NULL DEFAULT true,
    "max_users" INTEGER,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_features" (
    "plan_id" TEXT NOT NULL,
    "feature_id" TEXT NOT NULL,
    "limit_value" INTEGER,

    CONSTRAINT "plan_features_pkey" PRIMARY KEY ("plan_id","feature_id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'active',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "auto_renew" BOOLEAN NOT NULL DEFAULT true,
    "price_locked" BOOLEAN NOT NULL DEFAULT false,
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "purpose" "PaymentPurpose" NOT NULL,
    "ref_id" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "service_fee" INTEGER NOT NULL DEFAULT 0,
    "provider" "PaymentProvider" NOT NULL,
    "provider_ref" TEXT,
    "card_last4" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" TIMESTAMP(3),

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "pdf_url" TEXT,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_methods" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "token_ref" TEXT NOT NULL,
    "last4" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "country_pricing" (
    "id" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "market_status" "MarketStatus" NOT NULL DEFAULT 'enabled',
    "price_gold" INTEGER NOT NULL,
    "price_platinum" INTEGER NOT NULL,
    "price_credits_pack" INTEGER NOT NULL,
    "cost_voice_per_minute" INTEGER NOT NULL,
    "cost_video_per_minute" INTEGER NOT NULL,
    "cost_boost" INTEGER NOT NULL,
    "last_updated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "country_pricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_limits" (
    "id" TEXT NOT NULL,
    "behavior" "LimitBehavior" NOT NULL,
    "window" "LimitWindow" NOT NULL DEFAULT 'day',
    "default_limit" INTEGER NOT NULL,
    "gold_limit" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "daily_limits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boosts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "duration_days" INTEGER NOT NULL,
    "cost_credits" INTEGER NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "daily_extra_impressions" INTEGER NOT NULL DEFAULT 5,
    "status" "BoostStatus" NOT NULL DEFAULT 'active',

    CONSTRAINT "boosts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "admin_id" TEXT,
    "type" TEXT NOT NULL,
    "title_ar" TEXT NOT NULL,
    "body_ar" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "channel" "NotificationChannel" NOT NULL DEFAULT 'push',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_templates" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body_html" TEXT NOT NULL,
    "variables" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "trigger_rule" TEXT,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admins" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password_hash" TEXT NOT NULL,
    "avatar_url" TEXT,
    "status" "AdminStatus" NOT NULL DEFAULT 'active',
    "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_roles" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name_ar" TEXT NOT NULL,
    "scope" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_user_roles" (
    "admin_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "assigned_by" TEXT,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_user_roles_pkey" PRIMARY KEY ("admin_id","role_id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name_ar" TEXT NOT NULL,
    "group" TEXT NOT NULL,
    "is_sensitive" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,
    "access" "PermissionAccess" NOT NULL DEFAULT 'partial',

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "admin_sessions" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "ip_address" TEXT,
    "device" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flags" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name_ar" TEXT,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "rollout" INTEGER NOT NULL DEFAULT 100,
    "description" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "group" TEXT NOT NULL DEFAULT 'general',
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actor_admin_id" TEXT,
    "actor_role" TEXT,
    "action" TEXT NOT NULL,
    "target_type" TEXT,
    "target_id" TEXT,
    "old_value" JSONB,
    "new_value" JSONB,
    "reason" TEXT,
    "ip_address" TEXT,
    "device" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_events" (
    "id" BIGSERIAL NOT NULL,
    "user_id" TEXT,
    "name" TEXT NOT NULL,
    "props" JSONB NOT NULL DEFAULT '{}',
    "country" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_country_city_idx" ON "users"("country", "city");

-- CreateIndex
CREATE INDEX "users_account_status_verification_idx" ON "users"("account_status", "verification");

-- CreateIndex
CREATE INDEX "users_deleted_at_idx" ON "users"("deleted_at");

-- CreateIndex
CREATE INDEX "user_devices_user_id_is_active_idx" ON "user_devices"("user_id", "is_active");

-- CreateIndex
CREATE INDEX "user_devices_device_id_idx" ON "user_devices"("device_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_devices_user_id_device_id_key" ON "user_devices"("user_id", "device_id");

-- CreateIndex
CREATE INDEX "user_sessions_user_id_revoked_at_idx" ON "user_sessions"("user_id", "revoked_at");

-- CreateIndex
CREATE INDEX "user_sessions_device_id_idx" ON "user_sessions"("device_id");

-- CreateIndex
CREATE INDEX "otp_codes_phone_purpose_created_at_idx" ON "otp_codes"("phone", "purpose", "created_at");

-- CreateIndex
CREATE INDEX "otp_codes_expires_at_idx" ON "otp_codes"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "social_accounts_provider_provider_uid_key" ON "social_accounts"("provider", "provider_uid");

-- CreateIndex
CREATE INDEX "login_attempts_phone_created_at_idx" ON "login_attempts"("phone", "created_at");

-- CreateIndex
CREATE INDEX "login_attempts_ip_address_created_at_idx" ON "login_attempts"("ip_address", "created_at");

-- CreateIndex
CREATE INDEX "login_attempts_success_created_at_idx" ON "login_attempts"("success", "created_at");

-- CreateIndex
CREATE INDEX "password_resets_user_id_idx" ON "password_resets"("user_id");

-- CreateIndex
CREATE INDEX "risk_scores_user_id_created_at_idx" ON "risk_scores"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "risk_scores_level_idx" ON "risk_scores"("level");

-- CreateIndex
CREATE INDEX "fraud_signals_user_id_signal_idx" ON "fraud_signals"("user_id", "signal");

-- CreateIndex
CREATE UNIQUE INDEX "blocked_users_blocker_id_blocked_id_key" ON "blocked_users"("blocker_id", "blocked_id");

-- CreateIndex
CREATE INDEX "profile_photos_user_id_category_status_idx" ON "profile_photos"("user_id", "category", "status");

-- CreateIndex
CREATE INDEX "photo_access_requests_requester_id_status_idx" ON "photo_access_requests"("requester_id", "status");

-- CreateIndex
CREATE INDEX "photo_access_requests_owner_id_status_idx" ON "photo_access_requests"("owner_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "preference_weights_user_id_criterion_key" ON "preference_weights"("user_id", "criterion");

-- CreateIndex
CREATE UNIQUE INDEX "core_values_key_key" ON "core_values"("key");

-- CreateIndex
CREATE UNIQUE INDEX "deal_breaker_catalog_key_key" ON "deal_breaker_catalog"("key");

-- CreateIndex
CREATE UNIQUE INDEX "deal_breakers_user_id_breaker_id_key" ON "deal_breakers"("user_id", "breaker_id");

-- CreateIndex
CREATE INDEX "verification_requests_user_id_status_idx" ON "verification_requests"("user_id", "status");

-- CreateIndex
CREATE INDEX "recommendation_runs_user_id_run_date_idx" ON "recommendation_runs"("user_id", "run_date");

-- CreateIndex
CREATE INDEX "recommendations_user_id_status_idx" ON "recommendations"("user_id", "status");

-- CreateIndex
CREATE INDEX "profile_views_viewed_id_created_at_idx" ON "profile_views"("viewed_id", "created_at");

-- CreateIndex
CREATE INDEX "top_profile_views_user_id_viewed_at_idx" ON "top_profile_views"("user_id", "viewed_at");

-- CreateIndex
CREATE INDEX "likes_to_user_id_action_idx" ON "likes"("to_user_id", "action");

-- CreateIndex
CREATE UNIQUE INDEX "likes_from_user_id_to_user_id_action_key" ON "likes"("from_user_id", "to_user_id", "action");

-- CreateIndex
CREATE UNIQUE INDEX "matches_user_a_user_b_key" ON "matches"("user_a", "user_b");

-- CreateIndex
CREATE UNIQUE INDEX "favorites_user_id_target_id_key" ON "favorites"("user_id", "target_id");

-- CreateIndex
CREATE INDEX "conversations_status_last_message_at_idx" ON "conversations"("status", "last_message_at");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_participants_conversation_id_user_id_key" ON "conversation_participants"("conversation_id", "user_id");

-- CreateIndex
CREATE INDEX "messages_conversation_id_created_at_idx" ON "messages"("conversation_id", "created_at");

-- CreateIndex
CREATE INDEX "calls_caller_id_created_at_idx" ON "calls"("caller_id", "created_at");

-- CreateIndex
CREATE INDEX "calls_receiver_id_created_at_idx" ON "calls"("receiver_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "walis_user_id_key" ON "walis"("user_id");

-- CreateIndex
CREATE INDEX "wali_links_user_id_status_idx" ON "wali_links"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "wali_invitations_token_key" ON "wali_invitations"("token");

-- CreateIndex
CREATE UNIQUE INDEX "community_topics_key_key" ON "community_topics"("key");

-- CreateIndex
CREATE INDEX "posts_status_published_at_idx" ON "posts"("status", "published_at");

-- CreateIndex
CREATE INDEX "posts_topic_id_idx" ON "posts"("topic_id");

-- CreateIndex
CREATE INDEX "comments_post_id_created_at_idx" ON "comments"("post_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "blog_categories_key_key" ON "blog_categories"("key");

-- CreateIndex
CREATE UNIQUE INDEX "blog_articles_slug_key" ON "blog_articles"("slug");

-- CreateIndex
CREATE INDEX "blog_articles_status_published_at_idx" ON "blog_articles"("status", "published_at");

-- CreateIndex
CREATE UNIQUE INDEX "report_reasons_key_key" ON "report_reasons"("key");

-- CreateIndex
CREATE UNIQUE INDEX "reports_reference_key" ON "reports"("reference");

-- CreateIndex
CREATE INDEX "reports_status_created_at_idx" ON "reports"("status", "created_at");

-- CreateIndex
CREATE INDEX "moderation_actions_target_type_target_id_idx" ON "moderation_actions"("target_type", "target_id");

-- CreateIndex
CREATE UNIQUE INDEX "banned_words_word_key" ON "banned_words"("word");

-- CreateIndex
CREATE UNIQUE INDEX "credit_transactions_reference_key" ON "credit_transactions"("reference");

-- CreateIndex
CREATE INDEX "credit_transactions_user_id_created_at_idx" ON "credit_transactions"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "credit_packages_key_key" ON "credit_packages"("key");

-- CreateIndex
CREATE UNIQUE INDEX "feature_catalog_key_key" ON "feature_catalog"("key");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_key_key" ON "subscription_plans"("key");

-- CreateIndex
CREATE INDEX "subscriptions_user_id_status_idx" ON "subscriptions"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "payments_reference_key" ON "payments"("reference");

-- CreateIndex
CREATE INDEX "payments_user_id_created_at_idx" ON "payments"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_payment_id_key" ON "invoices"("payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "country_pricing_country_key" ON "country_pricing"("country");

-- CreateIndex
CREATE UNIQUE INDEX "daily_limits_behavior_window_key" ON "daily_limits"("behavior", "window");

-- CreateIndex
CREATE INDEX "boosts_user_id_status_idx" ON "boosts"("user_id", "status");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_created_at_idx" ON "notifications"("user_id", "is_read", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "push_tokens_token_key" ON "push_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "email_templates_key_key" ON "email_templates"("key");

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "admin_roles_key_key" ON "admin_roles"("key");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_key_key" ON "permissions"("key");

-- CreateIndex
CREATE INDEX "permissions_group_idx" ON "permissions"("group");

-- CreateIndex
CREATE INDEX "admin_sessions_admin_id_revoked_at_idx" ON "admin_sessions"("admin_id", "revoked_at");

-- CreateIndex
CREATE UNIQUE INDEX "feature_flags_key_key" ON "feature_flags"("key");

-- CreateIndex
CREATE UNIQUE INDEX "app_settings_key_key" ON "app_settings"("key");

-- CreateIndex
CREATE INDEX "app_settings_group_idx" ON "app_settings"("group");

-- CreateIndex
CREATE INDEX "audit_logs_actor_admin_id_created_at_idx" ON "audit_logs"("actor_admin_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_target_type_target_id_idx" ON "audit_logs"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_created_at_idx" ON "audit_logs"("action", "created_at");

-- CreateIndex
CREATE INDEX "analytics_events_name_created_at_idx" ON "analytics_events"("name", "created_at");

-- AddForeignKey
ALTER TABLE "user_devices" ADD CONSTRAINT "user_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "user_devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "otp_codes" ADD CONSTRAINT "otp_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_accounts" ADD CONSTRAINT "social_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "login_attempts" ADD CONSTRAINT "login_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_scores" ADD CONSTRAINT "risk_scores_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fraud_signals" ADD CONSTRAINT "fraud_signals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocked_users" ADD CONSTRAINT "blocked_users_blocker_id_fkey" FOREIGN KEY ("blocker_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocked_users" ADD CONSTRAINT "blocked_users_blocked_id_fkey" FOREIGN KEY ("blocked_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_marriage" ADD CONSTRAINT "profile_marriage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_about" ADD CONSTRAINT "profile_about_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_photos" ADD CONSTRAINT "profile_photos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo_access_requests" ADD CONSTRAINT "photo_access_requests_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "profile_photos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo_access_requests" ADD CONSTRAINT "photo_access_requests_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo_access_requests" ADD CONSTRAINT "photo_access_requests_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_locations" ADD CONSTRAINT "user_locations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preference_weights" ADD CONSTRAINT "preference_weights_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_core_values" ADD CONSTRAINT "user_core_values_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_core_values" ADD CONSTRAINT "user_core_values_value_id_fkey" FOREIGN KEY ("value_id") REFERENCES "core_values"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_breakers" ADD CONSTRAINT "deal_breakers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_breakers" ADD CONSTRAINT "deal_breakers_breaker_id_fkey" FOREIGN KEY ("breaker_id") REFERENCES "deal_breaker_catalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "privacy_settings" ADD CONSTRAINT "privacy_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_requests" ADD CONSTRAINT "verification_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_steps" ADD CONSTRAINT "verification_steps_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "verification_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liveness_checks" ADD CONSTRAINT "liveness_checks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity_documents" ADD CONSTRAINT "identity_documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendation_runs" ADD CONSTRAINT "recommendation_runs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "recommendation_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_views" ADD CONSTRAINT "profile_views_viewer_id_fkey" FOREIGN KEY ("viewer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_views" ADD CONSTRAINT "profile_views_viewed_id_fkey" FOREIGN KEY ("viewed_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "top_profile_views" ADD CONSTRAINT "top_profile_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "top_profile_views" ADD CONSTRAINT "top_profile_views_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "likes" ADD CONSTRAINT "likes_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "likes" ADD CONSTRAINT "likes_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_user_a_fkey" FOREIGN KEY ("user_a") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_user_b_fkey" FOREIGN KEY ("user_b") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "filter_presets" ADD CONSTRAINT "filter_presets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_attachments" ADD CONSTRAINT "message_attachments_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_receipts" ADD CONSTRAINT "message_receipts_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_receipts" ADD CONSTRAINT "message_receipts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_requests" ADD CONSTRAINT "message_requests_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_requests" ADD CONSTRAINT "message_requests_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calls" ADD CONSTRAINT "calls_caller_id_fkey" FOREIGN KEY ("caller_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calls" ADD CONSTRAINT "calls_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_events" ADD CONSTRAINT "call_events_call_id_fkey" FOREIGN KEY ("call_id") REFERENCES "calls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "walis" ADD CONSTRAINT "walis_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wali_links" ADD CONSTRAINT "wali_links_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wali_links" ADD CONSTRAINT "wali_links_wali_id_fkey" FOREIGN KEY ("wali_id") REFERENCES "walis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wali_invitations" ADD CONSTRAINT "wali_invitations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wali_invitations" ADD CONSTRAINT "wali_invitations_wali_id_fkey" FOREIGN KEY ("wali_id") REFERENCES "walis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wali_permissions" ADD CONSTRAINT "wali_permissions_wali_link_id_fkey" FOREIGN KEY ("wali_link_id") REFERENCES "wali_links"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_follows" ADD CONSTRAINT "topic_follows_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_follows" ADD CONSTRAINT "topic_follows_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "community_topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "community_topics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_media" ADD CONSTRAINT "post_media_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "blog_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_reactions" ADD CONSTRAINT "post_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_reactions" ADD CONSTRAINT "post_reactions_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_articles" ADD CONSTRAINT "blog_articles_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "blog_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_article_reactions" ADD CONSTRAINT "blog_article_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_article_reactions" ADD CONSTRAINT "blog_article_reactions_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "blog_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reason_id_fkey" FOREIGN KEY ("reason_id") REFERENCES "report_reasons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_access_rules" ADD CONSTRAINT "feature_access_rules_feature_id_fkey" FOREIGN KEY ("feature_id") REFERENCES "feature_catalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_features" ADD CONSTRAINT "plan_features_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_features" ADD CONSTRAINT "plan_features_feature_id_fkey" FOREIGN KEY ("feature_id") REFERENCES "feature_catalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boosts" ADD CONSTRAINT "boosts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_user_roles" ADD CONSTRAINT "admin_user_roles_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_user_roles" ADD CONSTRAINT "admin_user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "admin_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "admin_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_admin_id_fkey" FOREIGN KEY ("actor_admin_id") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
