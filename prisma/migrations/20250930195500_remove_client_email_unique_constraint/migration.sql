-- Drop the unique constraint on Client.email
DROP INDEX IF EXISTS "clients_email_key";

-- Add a compound unique constraint on email + organizationId instead
-- This allows the same email in different organizations
CREATE UNIQUE INDEX "clients_email_organizationId_key" ON "clients"("email", "organizationId");