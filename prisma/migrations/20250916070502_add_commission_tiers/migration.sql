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

-- Insert default commission tiers
INSERT INTO "commission_tiers" ("id", "minSessions", "maxSessions", "percentage", "createdAt", "updatedAt") VALUES
    (gen_random_uuid()::text, 0, 30, 25, NOW(), NOW()),
    (gen_random_uuid()::text, 31, 60, 30, NOW(), NOW()),
    (gen_random_uuid()::text, 61, NULL, 35, NOW(), NOW());