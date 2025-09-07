-- CreateTable
CREATE TABLE "public"."email_logs" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "template" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "messageId" TEXT,
    "sentAt" TIMESTAMP(3),
    "error" TEXT,
    "metadata" JSONB,
    "responseTime" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_logs_status_idx" ON "public"."email_logs"("status");

-- CreateIndex
CREATE INDEX "email_logs_createdAt_idx" ON "public"."email_logs"("createdAt");

-- CreateIndex
CREATE INDEX "email_logs_messageId_idx" ON "public"."email_logs"("messageId");
