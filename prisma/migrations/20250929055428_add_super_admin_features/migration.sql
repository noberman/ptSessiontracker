/*
  Warnings:

  - You are about to drop the column `description` on the `package_types` table. All the data in the column will be lost.
  - You are about to drop the column `displayName` on the `package_types` table. All the data in the column will be lost.
  - You are about to drop the `package_templates` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
ALTER TYPE "public"."Role" ADD VALUE 'SUPER_ADMIN';

-- AlterEnum
ALTER TYPE "public"."SubscriptionTier" ADD VALUE 'GROWTH';

-- DropForeignKey
ALTER TABLE "public"."package_templates" DROP CONSTRAINT "package_templates_organizationId_fkey";

-- DropIndex
DROP INDEX "public"."users_onboarding_completed_at_idx";

-- AlterTable
ALTER TABLE "public"."organizations" ADD COLUMN     "adminNotes" TEXT,
ADD COLUMN     "clonedAt" TIMESTAMP(3),
ADD COLUMN     "clonedFrom" TEXT,
ADD COLUMN     "isClone" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastIssue" TEXT,
ADD COLUMN     "lastIssueDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."package_types" DROP COLUMN "description",
DROP COLUMN "displayName";

-- DropTable
DROP TABLE "public"."package_templates";

-- CreateTable
CREATE TABLE "public"."admin_audit_logs" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetUserId" TEXT,
    "targetOrgId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."temp_auth_tokens" (
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

-- CreateIndex
CREATE UNIQUE INDEX "temp_auth_tokens_token_key" ON "public"."temp_auth_tokens"("token");

-- CreateIndex
CREATE INDEX "temp_auth_tokens_token_idx" ON "public"."temp_auth_tokens"("token");

-- CreateIndex
CREATE INDEX "temp_auth_tokens_expiresAt_idx" ON "public"."temp_auth_tokens"("expiresAt");

-- AddForeignKey
ALTER TABLE "public"."clients" ADD CONSTRAINT "clients_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."packages" ADD CONSTRAINT "packages_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sessions" ADD CONSTRAINT "sessions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."temp_auth_tokens" ADD CONSTRAINT "temp_auth_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."temp_auth_tokens" ADD CONSTRAINT "temp_auth_tokens_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
