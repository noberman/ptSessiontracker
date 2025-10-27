-- Remove suspension fields from users table
ALTER TABLE "users" DROP COLUMN IF EXISTS "suspendedAt";
ALTER TABLE "users" DROP COLUMN IF EXISTS "suspendedReason";

-- Remove suspension fields from locations table
ALTER TABLE "locations" DROP COLUMN IF EXISTS "suspendedAt";
ALTER TABLE "locations" DROP COLUMN IF EXISTS "suspendedReason";