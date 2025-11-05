-- Commission Data Migration Script
-- Migrates from old commission_tiers structure to new commission_profiles and commission_tiers_v2

BEGIN;

-- Step 1: Create commission profiles for each organization that has commission tiers
-- Use GROUP BY to ensure one profile per organization
INSERT INTO commission_profiles (
    id,
    "organizationId",
    name,
    "isDefault",
    "isActive",
    "calculationMethod",
    "triggerType",
    "createdAt",
    "updatedAt"
)
SELECT
    gen_random_uuid() as id,
    ct."organizationId",
    CASE 
        WHEN EXISTS (SELECT 1 FROM commission_profiles WHERE "organizationId" = ct."organizationId" AND name LIKE '%v2%')
        THEN 'Default Commission Profile (v3)'
        WHEN EXISTS (SELECT 1 FROM commission_profiles WHERE "organizationId" = ct."organizationId")
        THEN 'Default Commission Profile (v2)'
        ELSE 'Default Commission Profile'
    END as name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM commission_profiles WHERE "organizationId" = ct."organizationId")
        THEN false  -- Not default if there's already a profile
        ELSE true
    END as "isDefault",
    true as "isActive",
    'PROGRESSIVE'::"CalculationMethod" as "calculationMethod",
    'SESSION_COUNT' as "triggerType",
    NOW() as "createdAt",
    NOW() as "updatedAt"
FROM (
    SELECT DISTINCT "organizationId"
    FROM commission_tiers
    WHERE "organizationId" IS NOT NULL
) ct;

-- Step 2: Migrate commission tiers to new structure  
WITH profile_mapping AS (
    SELECT 
        ct."organizationId",
        cp.id as profile_id
    FROM commission_tiers ct
    JOIN commission_profiles cp ON cp."organizationId" = ct."organizationId"
    WHERE cp.name LIKE 'Default Commission Profile%'
    AND cp."createdAt" = (
        SELECT MAX("createdAt") 
        FROM commission_profiles cp2 
        WHERE cp2."organizationId" = cp."organizationId"
    )
)
INSERT INTO commission_tiers_v2 (
    id,
    "profileId",
    "tierLevel",
    "sessionThreshold",
    "sessionCommissionPercent",
    "createdAt",
    "updatedAt"
)
SELECT DISTINCT ON (pm.profile_id, ct."minSessions")
    gen_random_uuid() as id,
    pm.profile_id as "profileId",
    DENSE_RANK() OVER (PARTITION BY ct."organizationId" ORDER BY ct."minSessions") as "tierLevel",
    ct."minSessions" as "sessionThreshold",
    ct.percentage * 100 as "sessionCommissionPercent",  -- Convert 0.23 to 23%
    ct."createdAt",
    ct."updatedAt"
FROM commission_tiers ct
JOIN profile_mapping pm ON pm."organizationId" = ct."organizationId"
WHERE NOT EXISTS (
    SELECT 1 FROM commission_tiers_v2 ct2
    WHERE ct2."profileId" = pm.profile_id
);

-- Step 3: Update trainers and PT managers to use the commission profile for their organization
-- Only update users who don't already have a profile assigned
UPDATE users u
SET "commissionProfileId" = (
    SELECT cp.id 
    FROM commission_profiles cp 
    WHERE cp."organizationId" = u."organizationId" 
    AND cp."isDefault" = true
    ORDER BY cp."createdAt" DESC
    LIMIT 1
)
WHERE u."organizationId" IS NOT NULL
AND u."commissionProfileId" IS NULL
AND u.role IN ('TRAINER', 'PT_MANAGER')
AND EXISTS (
    SELECT 1 FROM commission_profiles cp 
    WHERE cp."organizationId" = u."organizationId"
    AND cp."isDefault" = true
);

-- Step 4: Log migration summary
DO $$
DECLARE
    profiles_created INTEGER;
    tiers_migrated INTEGER;
    users_updated INTEGER;
BEGIN
    SELECT COUNT(DISTINCT "organizationId") INTO profiles_created
    FROM commission_profiles 
    WHERE name = 'Default Commission Profile';
    
    SELECT COUNT(*) INTO tiers_migrated
    FROM commission_tiers_v2;
    
    GET DIAGNOSTICS users_updated = ROW_COUNT;
    
    RAISE NOTICE 'Migration Summary:';
    RAISE NOTICE '  Commission Profiles Created: %', profiles_created;
    RAISE NOTICE '  Commission Tiers Migrated: %', tiers_migrated;
    RAISE NOTICE '  Users Updated with Profile: %', users_updated;
END $$;

COMMIT;

-- Verification queries (run these separately after migration)
-- 
-- Check migrated profiles:
-- SELECT * FROM commission_profiles WHERE name = 'Default Commission Profile';
--
-- Check migrated tiers:
-- SELECT cp.name as profile_name, cp."organizationId", ct.* 
-- FROM commission_tiers_v2 ct
-- JOIN commission_profiles cp ON ct."profileId" = cp.id
-- ORDER BY cp."organizationId", ct."tierLevel";
--
-- Check users with profiles:
-- SELECT u.name, u.role, cp.name as profile_name
-- FROM users u
-- LEFT JOIN commission_profiles cp ON u."commissionProfileId" = cp.id
-- WHERE u.role IN ('TRAINER', 'PT_MANAGER')
-- ORDER BY u.role, u.name;