-- Fix Production Package Types
-- This creates the actual package types based on existing packages
-- 
-- Run on PRODUCTION only
-- ================================================

BEGIN;

-- First, let's see what organization we have
DO $$
DECLARE
  org_id TEXT;
BEGIN
  -- Get the organization ID (should be Snap Fitness Singapore)
  SELECT id INTO org_id FROM organizations LIMIT 1;
  
  IF org_id IS NULL THEN
    RAISE EXCEPTION 'No organization found!';
  END IF;

  -- Delete the generic test package types
  DELETE FROM package_types 
  WHERE "organizationId" = org_id
  AND name IN ('Basic Package', 'Standard Package', 'Premium Package', 'Elite Package', 'Custom Package');

  -- Now create the actual package types based on real usage
  -- These are derived from the actual package names in production
  
  -- PT Session Packages
  INSERT INTO package_types (id, "organizationId", name, "defaultSessions", "defaultPrice", "isActive", "sortOrder", "createdAt", "updatedAt")
  VALUES 
    (gen_random_uuid(), org_id, '3 Session Intro Pack', 3, 150, true, 1, NOW(), NOW()),
    (gen_random_uuid(), org_id, '12 Prime PT Sessions', 12, 600, true, 2, NOW(), NOW()),
    (gen_random_uuid(), org_id, '24 Prime PT Sessions', 24, 1100, true, 3, NOW(), NOW()),
    (gen_random_uuid(), org_id, '36 Prime PT Sessions', 36, 1500, true, 4, NOW(), NOW());

  -- Transformation Challenge Packages
  INSERT INTO package_types (id, "organizationId", name, "defaultSessions", "defaultPrice", "isActive", "sortOrder", "createdAt", "updatedAt")
  VALUES 
    (gen_random_uuid(), org_id, 'Transformation Challenge - 12 Credits', 12, 400, true, 5, NOW(), NOW()),
    (gen_random_uuid(), org_id, 'Transformation Challenge - 24 Credits', 24, 750, true, 6, NOW(), NOW()),
    (gen_random_uuid(), org_id, 'Transformation Challenge - 36 Credits', 36, 1000, true, 7, NOW(), NOW());

  -- Classes Package
  INSERT INTO package_types (id, "organizationId", name, "defaultSessions", "defaultPrice", "isActive", "sortOrder", "createdAt", "updatedAt")
  VALUES 
    (gen_random_uuid(), org_id, 'Classes', NULL, NULL, true, 8, NOW(), NOW());

  -- Custom Package (for flexibility)
  INSERT INTO package_types (id, "organizationId", name, "defaultSessions", "defaultPrice", "isActive", "sortOrder", "createdAt", "updatedAt")
  VALUES 
    (gen_random_uuid(), org_id, 'Custom', NULL, NULL, true, 9, NOW(), NOW());

  RAISE NOTICE 'Package types created successfully!';
END $$;

-- Verify the results
SELECT name, "defaultSessions", "defaultPrice", "isActive" 
FROM package_types 
ORDER BY "sortOrder";

COMMIT;

-- To rollback if needed:
-- ROLLBACK;