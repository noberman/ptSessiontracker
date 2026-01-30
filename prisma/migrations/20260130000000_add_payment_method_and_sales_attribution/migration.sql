-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CARD', 'BANK_TRANSFER', 'OTHER');

-- AlterTable
ALTER TABLE "payments" ADD COLUMN "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CARD';
ALTER TABLE "payments" ADD COLUMN "salesAttributedToId" TEXT;
ALTER TABLE "payments" ADD COLUMN "salesAttributedTo2Id" TEXT;

-- CreateIndex
CREATE INDEX "payments_salesAttributedToId_idx" ON "payments"("salesAttributedToId");

-- CreateIndex
CREATE INDEX "payments_salesAttributedTo2Id_idx" ON "payments"("salesAttributedTo2Id");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_salesAttributedToId_fkey" FOREIGN KEY ("salesAttributedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_salesAttributedTo2Id_fkey" FOREIGN KEY ("salesAttributedTo2Id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
