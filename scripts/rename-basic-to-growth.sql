-- Script to rename BASIC subscription tier to GROWTH
-- This is safe as it updates existing data and then changes the enum

-- First, update any organizations using BASIC to use GROWTH
-- (Note: Since GROWTH doesn't exist in the enum yet, we'll need to do this in steps)

-- Step 1: Add GROWTH to the enum (if it doesn't exist)
ALTER TYPE "SubscriptionTier" ADD VALUE IF NOT EXISTS 'GROWTH';

-- Step 2: Update all BASIC values to GROWTH
UPDATE organizations 
SET "subscriptionTier" = 'GROWTH'::"SubscriptionTier"
WHERE "subscriptionTier" = 'BASIC'::"SubscriptionTier";

-- Note: We cannot remove BASIC from the enum in PostgreSQL
-- It will remain but unused. This is a PostgreSQL limitation.
-- The application code will only use FREE, GROWTH, and PRO going forward.

-- Verify the update
SELECT "subscriptionTier", COUNT(*) 
FROM organizations 
GROUP BY "subscriptionTier";