-- CreateTable
CREATE TABLE "email_change_requests" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "new_email" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "resend_after" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_change_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_change_requests_user_id_created_at_idx" ON "email_change_requests"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "email_change_requests_new_email_idx" ON "email_change_requests"("new_email");

-- AddForeignKey
ALTER TABLE "email_change_requests" ADD CONSTRAINT "email_change_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
