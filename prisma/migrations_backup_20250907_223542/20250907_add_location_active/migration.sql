-- AlterTable: Add active column to locations
ALTER TABLE "public"."locations" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;

-- DropColumn: Remove unused address column
ALTER TABLE "public"."locations" DROP COLUMN IF EXISTS "address";

-- CreateIndex: Add unique constraint on location name
CREATE UNIQUE INDEX "locations_name_key" ON "public"."locations"("name");

-- CreateTable: Add package_templates table
CREATE TABLE "public"."package_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "sessions" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "sessionValue" DOUBLE PRECISION NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "package_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Add indexes for package_templates
CREATE UNIQUE INDEX "package_templates_name_key" ON "public"."package_templates"("name");
CREATE INDEX "package_templates_category_idx" ON "public"."package_templates"("category");
CREATE INDEX "package_templates_active_idx" ON "public"."package_templates"("active");