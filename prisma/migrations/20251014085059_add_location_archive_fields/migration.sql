-- AlterTable
ALTER TABLE "public"."locations" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "archivedBy" TEXT,
ADD COLUMN     "archivedReason" TEXT;

-- CreateIndex
CREATE INDEX "locations_active_idx" ON "public"."locations"("active");

-- CreateIndex
CREATE INDEX "locations_archivedAt_idx" ON "public"."locations"("archivedAt");
