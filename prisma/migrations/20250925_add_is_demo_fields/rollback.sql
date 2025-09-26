-- Rollback: Remove isDemo fields
-- WARNING: This will delete the columns and all data in them

ALTER TABLE "clients" DROP COLUMN IF EXISTS "isDemo";
ALTER TABLE "packages" DROP COLUMN IF EXISTS "isDemo";
ALTER TABLE "sessions" DROP COLUMN IF EXISTS "isDemo";