-- Verification queries for organization migration

-- 1. Check for any clients without organizationId after migration
SELECT 'Clients without organizationId' as check_name, COUNT(*) as count
FROM "clients" c
WHERE c."organizationId" IS NULL;

-- 2. Check for any packages without organizationId after migration
SELECT 'Packages without organizationId' as check_name, COUNT(*) as count
FROM "packages" p
WHERE p."organizationId" IS NULL;

-- 3. Check for any sessions without organizationId after migration
SELECT 'Sessions without organizationId' as check_name, COUNT(*) as count
FROM "sessions" s
WHERE s."organizationId" IS NULL;

-- 4. Verify data consistency - clients should have same org as their location
SELECT 'Clients with mismatched organizationId' as check_name, COUNT(*) as count
FROM "clients" c
INNER JOIN "locations" l ON c."locationId" = l."id"
WHERE c."organizationId" != l."organizationId";

-- 5. Verify data consistency - packages should have same org as their client
SELECT 'Packages with mismatched organizationId' as check_name, COUNT(*) as count
FROM "packages" p
INNER JOIN "clients" c ON p."clientId" = c."id"
WHERE p."organizationId" != c."organizationId"
AND p."organizationId" IS NOT NULL
AND c."organizationId" IS NOT NULL;

-- 6. Verify data consistency - sessions should have same org as their location
SELECT 'Sessions with mismatched organizationId' as check_name, COUNT(*) as count
FROM "sessions" s
INNER JOIN "locations" l ON s."locationId" = l."id"
WHERE s."organizationId" != l."organizationId"
AND s."organizationId" IS NOT NULL
AND l."organizationId" IS NOT NULL;

-- 7. Show organization distribution
SELECT 'Organization distribution' as check_name, o."name", 
       (SELECT COUNT(*) FROM "clients" WHERE "organizationId" = o."id") as clients,
       (SELECT COUNT(*) FROM "packages" WHERE "organizationId" = o."id") as packages,
       (SELECT COUNT(*) FROM "sessions" WHERE "organizationId" = o."id") as sessions
FROM "organizations" o;