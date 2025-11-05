-- Fix Script: Assign commission profiles to PT Managers
-- This ensures PT Managers who log sessions can have commissions calculated

BEGIN;

-- Step 1: Check which PT Managers don't have commission profiles
DO $$
DECLARE
    pt_managers_without_profile INTEGER;
BEGIN
    SELECT COUNT(*) INTO pt_managers_without_profile
    FROM users u
    WHERE u.role = 'PT_MANAGER'
    AND u."commissionProfileId" IS NULL
    AND u."organizationId" IS NOT NULL;
    
    RAISE NOTICE 'Found % PT Managers without commission profiles', pt_managers_without_profile;
END $$;

-- Step 2: Assign default commission profile to PT Managers without one
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
AND u.role = 'PT_MANAGER'
AND EXISTS (
    SELECT 1 FROM commission_profiles cp 
    WHERE cp."organizationId" = u."organizationId"
    AND cp."isDefault" = true
);

-- Step 3: For organizations without any commission profiles, create a default one
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
    gen_random_uuid(),
    o.id,
    'Default Commission Profile',
    true,
    true,
    'PROGRESSIVE'::"CalculationMethod",
    'SESSION_COUNT',
    NOW(),
    NOW()
FROM organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM commission_profiles cp 
    WHERE cp."organizationId" = o.id
)
AND EXISTS (
    SELECT 1 FROM users u 
    WHERE u."organizationId" = o.id 
    AND u.role IN ('TRAINER', 'PT_MANAGER')
);

-- Step 4: Create default tiers for new profiles (basic structure)
INSERT INTO commission_tiers_v2 (
    id,
    "profileId",
    "tierLevel",
    "sessionThreshold",
    "sessionCommissionPercent",
    "createdAt",
    "updatedAt"
)
SELECT 
    gen_random_uuid(),
    cp.id,
    1,
    0,
    20, -- 20% for tier 1
    NOW(),
    NOW()
FROM commission_profiles cp
WHERE cp.name = 'Default Commission Profile'
AND NOT EXISTS (
    SELECT 1 FROM commission_tiers_v2 ct 
    WHERE ct."profileId" = cp.id
);

-- Step 5: Now assign the newly created profiles to PT Managers
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
AND u.role = 'PT_MANAGER';

-- Step 6: Report results
DO $$
DECLARE
    profiles_created INTEGER;
    pt_managers_updated INTEGER;
    tiers_created INTEGER;
BEGIN
    SELECT COUNT(*) INTO profiles_created
    FROM commission_profiles 
    WHERE "createdAt" >= NOW() - INTERVAL '1 minute';
    
    SELECT COUNT(*) INTO pt_managers_updated
    FROM users 
    WHERE role = 'PT_MANAGER' 
    AND "commissionProfileId" IS NOT NULL;
    
    SELECT COUNT(*) INTO tiers_created
    FROM commission_tiers_v2
    WHERE "createdAt" >= NOW() - INTERVAL '1 minute';
    
    RAISE NOTICE 'Fix Summary:';
    RAISE NOTICE '  Commission Profiles Created: %', profiles_created;
    RAISE NOTICE '  PT Managers Updated: %', pt_managers_updated;
    RAISE NOTICE '  Commission Tiers Created: %', tiers_created;
END $$;

COMMIT;

-- Verification query to check the results
SELECT 
    u.name,
    u.email,
    u.role,
    cp.name as profile_name,
    cp."isDefault",
    COUNT(ct.id) as tier_count
FROM users u
LEFT JOIN commission_profiles cp ON u."commissionProfileId" = cp.id
LEFT JOIN commission_tiers_v2 ct ON ct."profileId" = cp.id
WHERE u.role IN ('TRAINER', 'PT_MANAGER')
GROUP BY u.id, u.name, u.email, u.role, cp.name, cp."isDefault"
ORDER BY u.role, u.name;