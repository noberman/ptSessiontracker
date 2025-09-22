-- CreateTable
CREATE TABLE "package_types" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "defaultSessions" INTEGER,
    "defaultPrice" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "package_types_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "packages" ADD COLUMN "packageTypeId" TEXT;

-- CreateIndex
CREATE INDEX "package_types_organizationId_idx" ON "package_types"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "package_types_organizationId_name_key" ON "package_types"("organizationId", "name");

-- AddForeignKey
ALTER TABLE "packages" ADD CONSTRAINT "packages_packageTypeId_fkey" FOREIGN KEY ("packageTypeId") REFERENCES "package_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_types" ADD CONSTRAINT "package_types_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;