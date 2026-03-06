-- Convert any LEAD clients to ACTIVE (they'll show as "Lead" computed state since they have zero packages)
UPDATE "clients" SET "status" = 'ACTIVE' WHERE "status" = 'LEAD';

-- Remove LEAD from ClientStatus enum
-- PostgreSQL requires creating a new type, migrating, then dropping the old one
ALTER TYPE "ClientStatus" RENAME TO "ClientStatus_old";
CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
ALTER TABLE "clients" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "clients" ALTER COLUMN "status" TYPE "ClientStatus" USING ("status"::text::"ClientStatus");
ALTER TABLE "clients" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
DROP TYPE "ClientStatus_old";
