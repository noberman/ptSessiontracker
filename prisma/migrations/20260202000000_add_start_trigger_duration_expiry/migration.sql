-- CreateEnum
CREATE TYPE "StartTrigger" AS ENUM ('DATE_OF_PURCHASE', 'FIRST_SESSION');

-- CreateEnum
CREATE TYPE "DurationUnit" AS ENUM ('DAYS', 'WEEKS', 'MONTHS');

-- AlterTable: Add start trigger and duration fields to package_types
ALTER TABLE "package_types" ADD COLUMN "startTrigger" "StartTrigger" NOT NULL DEFAULT 'DATE_OF_PURCHASE';
ALTER TABLE "package_types" ADD COLUMN "expiryDurationValue" INTEGER;
ALTER TABLE "package_types" ADD COLUMN "expiryDurationUnit" "DurationUnit";

-- AlterTable: Add effective start date to packages
ALTER TABLE "packages" ADD COLUMN "effectiveStartDate" TIMESTAMP(3);

-- Backfill: Set effectiveStartDate for all existing packages to their startDate (or createdAt)
-- This ensures existing packages are not incorrectly identified as "Not Started"
UPDATE "packages" SET "effectiveStartDate" = COALESCE("startDate", "createdAt") WHERE "effectiveStartDate" IS NULL;
