-- Add onboardingCompletedAt field to User model
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "onboarding_completed_at" TIMESTAMP(3);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS "users_onboarding_completed_at_idx" ON "users"("onboarding_completed_at");