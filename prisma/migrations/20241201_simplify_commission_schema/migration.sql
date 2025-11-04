-- Drop description column from commission_profiles
ALTER TABLE "commission_profiles" DROP COLUMN IF EXISTS "description";

-- Drop name column from commission_tiers_v2
ALTER TABLE "commission_tiers_v2" DROP COLUMN IF EXISTS "name";