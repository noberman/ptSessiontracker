-- Enable calendar for all existing organizations
UPDATE "organizations" SET "calendarEnabled" = true WHERE "calendarEnabled" = false;

-- Change default for new organizations
ALTER TABLE "organizations" ALTER COLUMN "calendarEnabled" SET DEFAULT true;
