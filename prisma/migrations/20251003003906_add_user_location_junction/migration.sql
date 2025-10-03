-- CreateTable
CREATE TABLE "public"."user_locations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_locations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_locations_userId_idx" ON "public"."user_locations"("userId");

-- CreateIndex
CREATE INDEX "user_locations_locationId_idx" ON "public"."user_locations"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "user_locations_userId_locationId_key" ON "public"."user_locations"("userId", "locationId");

-- AddForeignKey
ALTER TABLE "public"."user_locations" ADD CONSTRAINT "user_locations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_locations" ADD CONSTRAINT "user_locations_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Copy existing location assignments to junction table
-- For ALL users with a location (excluding Admins who have role-based access)
INSERT INTO "public"."user_locations" ("id", "userId", "locationId", "createdAt")
SELECT 
    gen_random_uuid(),
    "id" as "userId",
    "locationId",
    NOW() as "createdAt"
FROM "public"."users"
WHERE "locationId" IS NOT NULL
AND "role" != 'ADMIN';
