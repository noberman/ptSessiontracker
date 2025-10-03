-- Script to upgrade an organization to PRO tier
-- Run this in your staging database

-- First, see what organizations exist
SELECT id, name, email, "subscriptionTier" 
FROM organizations;

-- Upgrade the first organization (or change the WHERE clause to target a specific one)
UPDATE organizations 
SET 
  "subscriptionTier" = 'PRO',
  "subscriptionStatus" = 'ACTIVE',
  "updatedAt" = NOW()
WHERE email = 'admin@snapfitness.sg'  -- Change this to target specific org
OR name = 'Testing Org Staging';   -- Or use name

-- Verify the change
SELECT id, name, email, "subscriptionTier", "subscriptionStatus" 
FROM organizations 
WHERE "subscriptionTier" = 'PRO';