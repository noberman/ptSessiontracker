-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_locationId_fkey";

-- DropColumn
ALTER TABLE "users" DROP COLUMN "locationId";