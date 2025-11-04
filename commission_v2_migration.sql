-- DropForeignKey
ALTER TABLE "public"."commission_profiles" DROP CONSTRAINT "commission_profiles_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "public"."commission_tiers_v2" DROP CONSTRAINT "commission_tiers_v2_profileId_fkey";

-- DropForeignKey
ALTER TABLE "public"."commission_calculations" DROP CONSTRAINT "commission_calculations_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "public"."commission_calculations" DROP CONSTRAINT "commission_calculations_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."commission_calculations" DROP CONSTRAINT "commission_calculations_profileId_fkey";

-- DropForeignKey
ALTER TABLE "public"."users" DROP CONSTRAINT "users_commissionProfileId_fkey";

-- AlterTable
ALTER TABLE "public"."organizations" ALTER COLUMN "subscriptionTier" DROP NOT NULL,
ALTER COLUMN "subscriptionTier" DROP DEFAULT,
ALTER COLUMN "betaAccess" DROP NOT NULL,
ALTER COLUMN "betaExpiresAt" SET DATA TYPE TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "commissionProfileId";

-- DropTable
DROP TABLE "public"."commission_profiles";

-- DropTable
DROP TABLE "public"."commission_tiers_v2";

-- DropTable
DROP TABLE "public"."commission_calculations";

-- DropEnum
DROP TYPE "public"."CalculationMethod";

-- DropEnum
DROP TYPE "public"."TriggerType";

-- CreateIndex
CREATE INDEX "idx_organizations_beta" ON "public"."organizations"("betaAccess" ASC, "betaExpiresAt" ASC);

