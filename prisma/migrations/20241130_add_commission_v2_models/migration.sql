-- CreateEnum
CREATE TYPE "CalculationMethod" AS ENUM ('PROGRESSIVE', 'GRADUATED', 'FLAT');

-- CreateEnum  
CREATE TYPE "TriggerType" AS ENUM ('NONE', 'SESSION_COUNT', 'SALES_VOLUME', 'EITHER_OR', 'BOTH_AND');

-- CreateTable
CREATE TABLE "commission_profiles" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "calculationMethod" "CalculationMethod" NOT NULL DEFAULT 'PROGRESSIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commission_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commission_tiers_v2" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "profileId" TEXT NOT NULL,
    "tierLevel" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "triggerType" "TriggerType" NOT NULL,
    "sessionThreshold" INTEGER,
    "salesThreshold" DOUBLE PRECISION,
    "sessionCommissionPercent" DOUBLE PRECISION,
    "sessionFlatFee" DOUBLE PRECISION,
    "salesCommissionPercent" DOUBLE PRECISION,
    "salesFlatFee" DOUBLE PRECISION,
    "tierBonus" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commission_tiers_v2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commission_calculations" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "profileId" TEXT,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "calculationMethod" "CalculationMethod" NOT NULL,
    "totalSessions" INTEGER NOT NULL,
    "totalPackagesSold" INTEGER,
    "sessionCommission" DOUBLE PRECISION NOT NULL,
    "salesCommission" DOUBLE PRECISION,
    "tierBonus" DOUBLE PRECISION,
    "totalCommission" DOUBLE PRECISION NOT NULL,
    "tierReached" INTEGER,
    "calculationSnapshot" JSONB,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commission_calculations_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "users" ADD COLUMN "commissionProfileId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "commission_profiles_organizationId_name_key" ON "commission_profiles"("organizationId", "name");

-- CreateIndex
CREATE INDEX "commission_profiles_organizationId_idx" ON "commission_profiles"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "commission_tiers_v2_profileId_tierLevel_key" ON "commission_tiers_v2"("profileId", "tierLevel");

-- CreateIndex
CREATE INDEX "commission_tiers_v2_profileId_idx" ON "commission_tiers_v2"("profileId");

-- CreateIndex
CREATE INDEX "commission_calculations_userId_periodEnd_idx" ON "commission_calculations"("userId", "periodEnd");

-- CreateIndex
CREATE INDEX "commission_calculations_organizationId_periodEnd_idx" ON "commission_calculations"("organizationId", "periodEnd");

-- AddForeignKey
ALTER TABLE "commission_profiles" ADD CONSTRAINT "commission_profiles_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_tiers_v2" ADD CONSTRAINT "commission_tiers_v2_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "commission_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_calculations" ADD CONSTRAINT "commission_calculations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_calculations" ADD CONSTRAINT "commission_calculations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_calculations" ADD CONSTRAINT "commission_calculations_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "commission_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_commissionProfileId_fkey" FOREIGN KEY ("commissionProfileId") REFERENCES "commission_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;