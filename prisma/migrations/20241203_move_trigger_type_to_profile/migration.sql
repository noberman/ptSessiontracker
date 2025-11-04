-- Move triggerType from tier level to profile level

-- 1. Add triggerType to profile (default to SESSION_COUNT)
ALTER TABLE "commission_profiles" 
ADD COLUMN "triggerType" TEXT NOT NULL DEFAULT 'SESSION_COUNT';

-- 2. Update profiles based on their first tier's trigger type
UPDATE "commission_profiles" cp
SET "triggerType" = (
  SELECT ct."triggerType"
  FROM "commission_tiers_v2" ct
  WHERE ct."profileId" = cp.id
  ORDER BY ct."tierLevel"
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1 
  FROM "commission_tiers_v2" ct 
  WHERE ct."profileId" = cp.id
);

-- 3. Remove triggerType from tiers
ALTER TABLE "commission_tiers_v2" 
DROP COLUMN "triggerType";