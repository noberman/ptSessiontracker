-- Simplify Package System: Remove PackageTemplate and consolidate PackageType fields
-- WARNING: This migration is for staging/local only. Production needs special handling for data migration.

-- Step 1: Drop the package_templates table (should be empty in staging)
DROP TABLE IF EXISTS "package_templates" CASCADE;

-- Step 2: Update package_types to use single name field
-- First, copy displayName to name (if they differ)
UPDATE "package_types" 
SET "name" = "displayName" 
WHERE "displayName" IS NOT NULL AND "displayName" != '';

-- Step 3: Drop the unnecessary columns (using correct camelCase)
ALTER TABLE "package_types" 
DROP COLUMN IF EXISTS "displayName",
DROP COLUMN IF EXISTS "description";

-- Note: The name column already exists and has the unique constraint with organizationId
-- No need to recreate constraints