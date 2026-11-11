-- CreateTable
CREATE TABLE "wali_sessions" (
    "id" TEXT NOT NULL,
    "link_id" TEXT NOT NULL,
    "wali_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wali_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wali_sessions_token_hash_key" ON "wali_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "wali_sessions_link_id_revoked_at_idx" ON "wali_sessions"("link_id", "revoked_at");

-- CreateIndex
CREATE INDEX "wali_sessions_wali_id_revoked_at_idx" ON "wali_sessions"("wali_id", "revoked_at");

-- AddForeignKey
ALTER TABLE "wali_sessions" ADD CONSTRAINT "wali_sessions_link_id_fkey" FOREIGN KEY ("link_id") REFERENCES "wali_links"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wali_sessions" ADD CONSTRAINT "wali_sessions_wali_id_fkey" FOREIGN KEY ("wali_id") REFERENCES "walis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
