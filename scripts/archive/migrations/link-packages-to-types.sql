-- Link Existing Packages to Package Types
-- This connects all existing packages to their corresponding package types
-- 
-- Run on PRODUCTION only
-- ================================================

BEGIN;

-- Update each package to link to its corresponding package type
UPDATE packages p
SET "packageTypeId" = pt.id
FROM package_types pt
WHERE p.name = pt.name
AND p."packageTypeId" IS NULL;

-- Verify the update
SELECT 
  'Packages linked' as status,
  COUNT(*) as count 
FROM packages 
WHERE "packageTypeId" IS NOT NULL;

-- Show any packages that couldn't be linked (should be none)
SELECT 
  'Unlinked packages' as status,
  COUNT(*) as count,
  STRING_AGG(DISTINCT name, ', ') as names
FROM packages 
WHERE "packageTypeId" IS NULL
HAVING COUNT(*) > 0;

-- Show the final linkage
SELECT 
  pt.name as package_type,
  COUNT(p.id) as linked_packages
FROM package_types pt
LEFT JOIN packages p ON p."packageTypeId" = pt.id
GROUP BY pt.name
ORDER BY pt.name;

COMMIT;

-- To rollback if needed:
-- ROLLBACK;