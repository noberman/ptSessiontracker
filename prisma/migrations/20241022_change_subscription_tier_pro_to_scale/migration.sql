-- AlterEnum
-- This migration changes PRO to SCALE in the SubscriptionTier enum

BEGIN;

-- Create a new enum type with the new values
CREATE TYPE "SubscriptionTier_new" AS ENUM ('FREE', 'GROWTH', 'SCALE');

-- Add a temporary column with the new enum type
ALTER TABLE "organizations" ADD COLUMN "subscriptionTier_new" "SubscriptionTier_new";

-- Copy existing values, converting PRO to SCALE
UPDATE "organizations" 
SET "subscriptionTier_new" = 
  CASE 
    WHEN "subscriptionTier" = 'PRO' THEN 'SCALE'::text::"SubscriptionTier_new"
    WHEN "subscriptionTier" = 'GROWTH' THEN 'GROWTH'::text::"SubscriptionTier_new"
    WHEN "subscriptionTier" = 'FREE' THEN 'FREE'::text::"SubscriptionTier_new"
    ELSE 'FREE'::text::"SubscriptionTier_new"
  END;

-- Drop the old column
ALTER TABLE "organizations" DROP COLUMN "subscriptionTier";

-- Rename the new column to the original name
ALTER TABLE "organizations" RENAME COLUMN "subscriptionTier_new" TO "subscriptionTier";

-- Drop the old enum type
DROP TYPE "SubscriptionTier";

-- Rename the new enum type to the original name
ALTER TYPE "SubscriptionTier_new" RENAME TO "SubscriptionTier";

COMMIT;