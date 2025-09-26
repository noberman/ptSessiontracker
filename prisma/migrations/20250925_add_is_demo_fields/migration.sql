-- Add isDemo field to clients table
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "isDemo" BOOLEAN NOT NULL DEFAULT false;

-- Add isDemo field to packages table  
ALTER TABLE "packages" ADD COLUMN IF NOT EXISTS "isDemo" BOOLEAN NOT NULL DEFAULT false;

-- Add isDemo field to sessions table
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "isDemo" BOOLEAN NOT NULL DEFAULT false;