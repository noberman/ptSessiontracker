-- DropIndex
DROP INDEX "users_email_key";

-- CreateIndex
CREATE UNIQUE INDEX "users_email_organizationId_key" ON "users"("email", "organizationId");