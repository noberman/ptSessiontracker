-- PRODUCTION MIGRATION: Simplify Package System
-- This migrates PackageTemplates to PackageTypes and consolidates name fields
-- 
-- IMPORTANT: Run this on PRODUCTION database only
-- Staging/Local has already been migrated
--
-- Author: Claude
-- Date: November 22, 2024
-- ================================================

-- Step 1: Backup existing data (run these queries first to save the data)
-- SELECT * FROM package_templates;
-- SELECT * FROM package_types;

BEGIN;

-- Step 2: Migrate all PackageTemplates to new PackageTypes
-- Each template becomes a new package type since they represent complete offerings
INSERT INTO package_types (
  id,
  "organizationId",
  name,
  "displayName",
  "defaultSessions",
  "defaultPrice",
  "isActive",
  "sortOrder",
  "createdAt",
  "updatedAt"
)
SELECT 
  gen_random_uuid(),
  "organizationId",
  LOWER(REPLACE("displayName", ' ', '_')), -- temporary for unique constraint
  "displayName",  -- "Elite 12 Sessions" - this will become our single name
  sessions,
  price,
  active,
  "sortOrder",
  "createdAt",
  NOW()
FROM package_templates
WHERE NOT EXISTS (
  SELECT 1 FROM package_types pt 
  WHERE pt."organizationId" = package_templates."organizationId" 
  AND pt."displayName" = package_templates."displayName"
);

-- Step 3: Delete old category-only PackageTypes (Elite, Prime, etc)
-- These were just categories, now embedded in the specific type names
DELETE FROM package_types 
WHERE "defaultSessions" IS NULL 
AND "defaultPrice" IS NULL;

-- Step 4: Update name field to match displayName (preparing for consolidation)
UPDATE package_types 
SET name = "displayName" 
WHERE "displayName" IS NOT NULL AND "displayName" != '';

-- Step 5: Drop the unique constraint on (organizationId, name)
ALTER TABLE package_types 
DROP CONSTRAINT IF EXISTS "package_types_organizationId_name_key";

-- Step 6: Drop unnecessary columns
ALTER TABLE package_types 
DROP COLUMN IF EXISTS "displayName",
DROP COLUMN IF EXISTS description;

-- Step 7: Re-add unique constraint on the single name field
ALTER TABLE package_types 
ADD CONSTRAINT "package_types_organizationId_name_key" 
UNIQUE ("organizationId", name);

-- Step 8: Drop the package_templates table
DROP TABLE IF EXISTS package_templates CASCADE;

-- Step 9: Update the Prisma migration table to mark this as applied
INSERT INTO "_prisma_migrations" (
  id,
  checksum,
  finished_at,
  migration_name,
  logs,
  rolled_back_at,
  started_at,
  applied_steps_count
) VALUES (
  gen_random_uuid()::text,
  'manual_production_migration',
  NOW(),
  '20241122_simplify_package_system',
  NULL,
  NULL,
  NOW(),
  1
);

COMMIT;

-- Verification queries (run after migration):
-- SELECT COUNT(*) FROM package_types;
-- SELECT * FROM package_types ORDER BY "organizationId", "sortOrder" LIMIT 20;
-- \d package_types