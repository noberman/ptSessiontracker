-- Fix Client Organization Issues Migration
-- This migration:
-- 1. Deletes duplicate clients with NULL organization (where a proper duplicate exists)
-- 2. Updates remaining NULL organization clients to inherit from their trainer

BEGIN;

-- Step 1: Delete duplicate clients with NULL organization
-- These are the 9 clients that have both a NULL version and a proper version
DELETE FROM clients
WHERE "organizationId" IS NULL
  AND name IN (
    SELECT name
    FROM clients
    GROUP BY name
    HAVING COUNT(*) > 1
      AND COUNT(CASE WHEN "organizationId" IS NOT NULL THEN 1 END) > 0
      AND COUNT(CASE WHEN "organizationId" IS NULL THEN 1 END) > 0
  )
  AND NOT EXISTS (
    -- Don't delete if this NULL version has sessions that the other doesn't
    SELECT 1
    FROM sessions s
    WHERE s."clientId" = clients.id
      AND s.cancelled = false
  );

-- Log what we deleted
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % duplicate clients with NULL organization', deleted_count;
END $$;

-- Step 2: Update remaining clients with NULL organization to inherit from their trainer
-- This includes Royce's 6 clients and any others that don't have duplicates
UPDATE clients
SET "organizationId" = u."organizationId"
FROM users u
WHERE clients."primaryTrainerId" = u.id
  AND clients."organizationId" IS NULL
  AND u."organizationId" IS NOT NULL;

-- Log what we updated
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % clients to have organization from their trainer', updated_count;
END $$;

-- Step 3: Verify no clients remain without organization (except those without trainers)
DO $$
DECLARE
  remaining_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO remaining_count
  FROM clients c
  WHERE c."organizationId" IS NULL
    AND c."primaryTrainerId" IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = c."primaryTrainerId"
        AND u."organizationId" IS NOT NULL
    );
  
  IF remaining_count > 0 THEN
    RAISE WARNING 'Still have % clients without organization that should have one', remaining_count;
  ELSE
    RAISE NOTICE 'All clients with trainers now have organizations';
  END IF;
END $$;

COMMIT;