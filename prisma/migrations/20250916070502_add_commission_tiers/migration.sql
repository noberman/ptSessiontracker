-- CreateTable
CREATE TABLE "commission_tiers" (
    "id" TEXT NOT NULL,
    "minSessions" INTEGER NOT NULL,
    "maxSessions" INTEGER,
    "percentage" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commission_tiers_pkey" PRIMARY KEY ("id")
);
