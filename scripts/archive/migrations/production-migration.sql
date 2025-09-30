-- Production Migration Script
-- This script applies all changes needed to bring production up to date with staging
-- Run this carefully on production database

-- 1. Add Stripe fields to organizations table (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'organizations' 
                   AND column_name = 'stripeCustomerId') THEN
        ALTER TABLE organizations 
        ADD COLUMN "stripeCustomerId" TEXT UNIQUE,
        ADD COLUMN "stripeSubscriptionId" TEXT;
    END IF;
END $$;

-- 2. Add subscription fields to organizations (if not exists)
DO $$
BEGIN
    -- Check if subscriptionTier column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'organizations' 
                   AND column_name = 'subscriptionTier') THEN
        -- First create the enum type if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SubscriptionTier') THEN
            CREATE TYPE "SubscriptionTier" AS ENUM ('FREE', 'GROWTH', 'PRO');
        END IF;
        
        ALTER TABLE organizations 
        ADD COLUMN "subscriptionTier" "SubscriptionTier" DEFAULT 'FREE' NOT NULL;
    END IF;
    
    -- Check if subscriptionStatus column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'organizations' 
                   AND column_name = 'subscriptionStatus') THEN
        -- First create the enum type if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SubscriptionStatus') THEN
            CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELED', 'PAST_DUE');
        END IF;
        
        ALTER TABLE organizations 
        ADD COLUMN "subscriptionStatus" "SubscriptionStatus" DEFAULT 'ACTIVE' NOT NULL;
    END IF;
END $$;

-- 3. Add GROWTH to SubscriptionTier enum if it doesn't exist
-- Note: We cannot remove BASIC from the enum in PostgreSQL
DO $$
BEGIN
    -- Check if GROWTH value exists in the enum
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'GROWTH' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'SubscriptionTier')
    ) THEN
        ALTER TYPE "SubscriptionTier" ADD VALUE IF NOT EXISTS 'GROWTH';
    END IF;
END $$;

-- 4. Update any BASIC subscriptions to GROWTH (if BASIC exists)
-- First check if BASIC exists in the enum
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'BASIC' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'SubscriptionTier')
    ) THEN
        UPDATE organizations 
        SET "subscriptionTier" = 'GROWTH'::"SubscriptionTier"
        WHERE "subscriptionTier" = 'BASIC'::"SubscriptionTier";
    END IF;
END $$;

-- 5. Verify the migration
SELECT 
    'Organizations with subscription info:' as description,
    COUNT(*) as count,
    "subscriptionTier",
    "subscriptionStatus"
FROM organizations 
GROUP BY "subscriptionTier", "subscriptionStatus";

-- Show if there are any organizations with Stripe IDs
SELECT 
    'Organizations with Stripe customer ID:' as description,
    COUNT(*) as count
FROM organizations 
WHERE "stripeCustomerId" IS NOT NULL;

-- Check enum values
SELECT 
    'SubscriptionTier enum values:' as description,
    enumlabel as value
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'SubscriptionTier')
ORDER BY enumsortorder;