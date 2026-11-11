-- AlterTable
ALTER TABLE "identity_documents" ADD COLUMN     "storage_key" TEXT;

-- AlterTable
ALTER TABLE "message_attachments" ADD COLUMN     "storage_key" TEXT;

-- AlterTable
ALTER TABLE "profile_photos" ADD COLUMN     "storage_key" TEXT;
