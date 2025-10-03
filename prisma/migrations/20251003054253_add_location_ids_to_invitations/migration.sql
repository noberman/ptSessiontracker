-- AlterTable
ALTER TABLE "public"."invitations" ADD COLUMN     "locationIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
