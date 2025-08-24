-- AlterTable
ALTER TABLE "public"."packages" ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "packageType" TEXT NOT NULL DEFAULT 'Custom',
ADD COLUMN     "remainingSessions" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "startDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."sessions" ADD COLUMN     "sessionType" TEXT NOT NULL DEFAULT 'PT',
ADD COLUMN     "validated" BOOLEAN NOT NULL DEFAULT false;
