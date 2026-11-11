-- AlterTable
ALTER TABLE "privacy_settings" ADD COLUMN "profile_photos_need_approval" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "profile_photo_access_requests" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "requester_id" TEXT NOT NULL,
    "status" "PhotoRequestStatus" NOT NULL DEFAULT 'pending',
    "ttl_seconds" INTEGER NOT NULL DEFAULT 86400,
    "accepted_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_photo_access_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profile_photo_access_requests_owner_id_requester_id_key" ON "profile_photo_access_requests"("owner_id", "requester_id");

-- CreateIndex
CREATE INDEX "profile_photo_access_requests_owner_id_status_idx" ON "profile_photo_access_requests"("owner_id", "status");

-- CreateIndex
CREATE INDEX "profile_photo_access_requests_requester_id_status_idx" ON "profile_photo_access_requests"("requester_id", "status");

-- AddForeignKey
ALTER TABLE "profile_photo_access_requests" ADD CONSTRAINT "profile_photo_access_requests_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_photo_access_requests" ADD CONSTRAINT "profile_photo_access_requests_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
