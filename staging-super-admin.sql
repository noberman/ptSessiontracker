-- Create SubscriptionTier enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SubscriptionTier') THEN
        CREATE TYPE "public"."SubscriptionTier" AS ENUM ('FREE', 'PRO', 'GROWTH');
    ELSE
        -- Add GROWTH value if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'GROWTH' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'SubscriptionTier')) THEN
            ALTER TYPE "public"."SubscriptionTier" ADD VALUE 'GROWTH';
        END IF;
    END IF;
END $$;

-- Add SUPER_ADMIN role if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'SUPER_ADMIN' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'Role')) THEN
        ALTER TYPE "public"."Role" ADD VALUE 'SUPER_ADMIN';
    END IF;
END $$;

-- Add columns to organizations table if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'adminNotes') THEN
        ALTER TABLE "public"."organizations" ADD COLUMN "adminNotes" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'clonedAt') THEN
        ALTER TABLE "public"."organizations" ADD COLUMN "clonedAt" TIMESTAMP(3);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'clonedFrom') THEN
        ALTER TABLE "public"."organizations" ADD COLUMN "clonedFrom" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'isClone') THEN
        ALTER TABLE "public"."organizations" ADD COLUMN "isClone" BOOLEAN NOT NULL DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'lastIssue') THEN
        ALTER TABLE "public"."organizations" ADD COLUMN "lastIssue" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'lastIssueDate') THEN
        ALTER TABLE "public"."organizations" ADD COLUMN "lastIssueDate" TIMESTAMP(3);
    END IF;
END $$;

-- Create admin_audit_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS "public"."admin_audit_logs" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetUserId" TEXT,
    "targetOrgId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- Create temp_auth_tokens table if it doesn't exist
CREATE TABLE IF NOT EXISTS "public"."temp_auth_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "temp_auth_tokens_pkey" PRIMARY KEY ("id")
);

-- Create indexes if they don't exist
CREATE UNIQUE INDEX IF NOT EXISTS "temp_auth_tokens_token_key" ON "public"."temp_auth_tokens"("token");
CREATE INDEX IF NOT EXISTS "temp_auth_tokens_token_idx" ON "public"."temp_auth_tokens"("token");
CREATE INDEX IF NOT EXISTS "temp_auth_tokens_expiresAt_idx" ON "public"."temp_auth_tokens"("expiresAt");

-- Add foreign keys if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'admin_audit_logs_adminId_fkey') THEN
        ALTER TABLE "public"."admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_adminId_fkey" 
        FOREIGN KEY ("adminId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'temp_auth_tokens_userId_fkey') THEN
        ALTER TABLE "public"."temp_auth_tokens" ADD CONSTRAINT "temp_auth_tokens_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'temp_auth_tokens_adminId_fkey') THEN
        ALTER TABLE "public"."temp_auth_tokens" ADD CONSTRAINT "temp_auth_tokens_adminId_fkey" 
        FOREIGN KEY ("adminId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;