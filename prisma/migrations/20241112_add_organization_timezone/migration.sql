-- Add timezone field to Organization
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "timezone" TEXT DEFAULT 'Asia/Singapore';