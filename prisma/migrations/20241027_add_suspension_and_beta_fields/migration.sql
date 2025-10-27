-- Add suspension fields to User model
ALTER TABLE "users" 
ADD COLUMN IF NOT EXISTS "suspendedAt" TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS "suspendedReason" TEXT;

-- Add suspension fields to Location model  
ALTER TABLE "locations"
ADD COLUMN IF NOT EXISTS "suspendedAt" TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS "suspendedReason" TEXT;

-- Add beta access fields to Organization model
ALTER TABLE "organizations"
ADD COLUMN IF NOT EXISTS "betaAccess" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "betaExpiresAt" TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS "betaPreviousTier" "SubscriptionTier";

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS "idx_users_suspended" ON "users"("suspendedAt");
CREATE INDEX IF NOT EXISTS "idx_locations_suspended" ON "locations"("suspendedAt");
CREATE INDEX IF NOT EXISTS "idx_organizations_beta" ON "organizations"("betaAccess", "betaExpiresAt");