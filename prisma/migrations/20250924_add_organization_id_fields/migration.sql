-- Add organizationId to clients table (nullable initially)
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;

-- Add organizationId to packages table (nullable initially)
ALTER TABLE "packages" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;

-- Add organizationId to sessions table (nullable initially)
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "clients_organizationId_idx" ON "clients"("organizationId");
CREATE INDEX IF NOT EXISTS "packages_organizationId_idx" ON "packages"("organizationId");
CREATE INDEX IF NOT EXISTS "sessions_organizationId_idx" ON "sessions"("organizationId");
CREATE INDEX IF NOT EXISTS "sessions_organizationId_sessionDate_idx" ON "sessions"("organizationId", "sessionDate");

-- Backfill organizationId for clients from their location
UPDATE "clients" c
SET "organizationId" = l."organizationId"
FROM "locations" l
WHERE c."locationId" = l."id"
AND c."organizationId" IS NULL
AND l."organizationId" IS NOT NULL;

-- Backfill organizationId for packages from their client's location
UPDATE "packages" p
SET "organizationId" = l."organizationId"
FROM "clients" c
INNER JOIN "locations" l ON c."locationId" = l."id"
WHERE p."clientId" = c."id"
AND p."organizationId" IS NULL
AND l."organizationId" IS NOT NULL;

-- Backfill organizationId for sessions from their location
UPDATE "sessions" s
SET "organizationId" = l."organizationId"
FROM "locations" l
WHERE s."locationId" = l."id"
AND s."organizationId" IS NULL
AND l."organizationId" IS NOT NULL;