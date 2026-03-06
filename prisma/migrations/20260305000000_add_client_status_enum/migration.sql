-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'LEAD', 'ARCHIVED');

-- AlterTable: Add status column with default ACTIVE
ALTER TABLE "clients" ADD COLUMN "status" "ClientStatus" NOT NULL DEFAULT 'ACTIVE';

-- Migrate data: archived clients become ARCHIVED
UPDATE "clients" SET "status" = 'ARCHIVED' WHERE "active" = false;

-- Drop the old active column
ALTER TABLE "clients" DROP COLUMN "active";
