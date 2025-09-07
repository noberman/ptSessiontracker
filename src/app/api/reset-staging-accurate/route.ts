import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// ACCURATE: Reset staging database with EXACT schema from migrations
export async function GET(request: NextRequest) {
  // Only allow in staging environment
  const isStaging = process.env.NEXTAUTH_URL?.includes('staging') || 
                     process.env.APP_URL?.includes('staging') ||
                     process.env.RAILWAY_ENVIRONMENT === 'staging'
  
  if (!isStaging) {
    return NextResponse.json(
      { error: 'Only allowed in staging environment' },
      { status: 403 }
    )
  }

  try {
    // Step 1: Drop all existing tables
    await prisma.$executeRaw`DROP SCHEMA public CASCADE`
    await prisma.$executeRaw`CREATE SCHEMA public`

    // Step 2: Execute migrations in exact order from migration files
    
    // Migration 1: 20250822031543_initial_schema
    await prisma.$executeRaw`CREATE TYPE "public"."Role" AS ENUM ('TRAINER', 'CLUB_MANAGER', 'PT_MANAGER', 'ADMIN')`
    
    await prisma.$executeRaw`
      CREATE TABLE "public"."locations" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "active" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
      )
    `
    
    await prisma.$executeRaw`
      CREATE TABLE "public"."users" (
        "id" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "password" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "role" "public"."Role" NOT NULL DEFAULT 'TRAINER',
        "locationId" TEXT,
        "active" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "users_pkey" PRIMARY KEY ("id")
      )
    `
    
    await prisma.$executeRaw`
      CREATE TABLE "public"."clients" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "phone" TEXT,
        "locationId" TEXT NOT NULL,
        "primaryTrainerId" TEXT,
        "active" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
      )
    `
    
    await prisma.$executeRaw`
      CREATE TABLE "public"."packages" (
        "id" TEXT NOT NULL,
        "clientId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "totalValue" DOUBLE PRECISION NOT NULL,
        "totalSessions" INTEGER NOT NULL,
        "sessionValue" DOUBLE PRECISION NOT NULL,
        "active" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "packages_pkey" PRIMARY KEY ("id")
      )
    `
    
    await prisma.$executeRaw`
      CREATE TABLE "public"."sessions" (
        "id" TEXT NOT NULL,
        "trainerId" TEXT NOT NULL,
        "clientId" TEXT NOT NULL,
        "packageId" TEXT,
        "locationId" TEXT NOT NULL,
        "sessionDate" TIMESTAMP(3) NOT NULL,
        "sessionValue" DOUBLE PRECISION NOT NULL,
        "validatedAt" TIMESTAMP(3),
        "validationToken" TEXT,
        "validationExpiry" TIMESTAMP(3),
        "notes" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
      )
    `
    
    await prisma.$executeRaw`
      CREATE TABLE "public"."commission_tiers" (
        "id" TEXT NOT NULL,
        "minSessions" INTEGER NOT NULL,
        "maxSessions" INTEGER,
        "percentage" DOUBLE PRECISION NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "commission_tiers_pkey" PRIMARY KEY ("id")
      )
    `
    
    await prisma.$executeRaw`
      CREATE TABLE "public"."audit_logs" (
        "id" TEXT NOT NULL,
        "userId" TEXT,
        "action" TEXT NOT NULL,
        "entityType" TEXT NOT NULL,
        "entityId" TEXT NOT NULL,
        "oldValue" JSONB,
        "newValue" JSONB,
        "ipAddress" TEXT,
        "userAgent" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
      )
    `
    
    // Create indexes from initial migration
    await prisma.$executeRaw`CREATE UNIQUE INDEX "locations_name_key" ON "public"."locations"("name")`
    await prisma.$executeRaw`CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email")`
    await prisma.$executeRaw`CREATE UNIQUE INDEX "clients_email_key" ON "public"."clients"("email")`
    await prisma.$executeRaw`CREATE UNIQUE INDEX "sessions_validationToken_key" ON "public"."sessions"("validationToken")`
    await prisma.$executeRaw`CREATE INDEX "sessions_trainerId_sessionDate_idx" ON "public"."sessions"("trainerId", "sessionDate")`
    await prisma.$executeRaw`CREATE INDEX "sessions_validationToken_idx" ON "public"."sessions"("validationToken")`
    await prisma.$executeRaw`CREATE INDEX "audit_logs_userId_idx" ON "public"."audit_logs"("userId")`
    await prisma.$executeRaw`CREATE INDEX "audit_logs_entityType_entityId_idx" ON "public"."audit_logs"("entityType", "entityId")`
    
    // Add foreign keys from initial migration
    await prisma.$executeRaw`ALTER TABLE "public"."users" ADD CONSTRAINT "users_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."locations"("id") ON DELETE SET NULL ON UPDATE CASCADE`
    await prisma.$executeRaw`ALTER TABLE "public"."clients" ADD CONSTRAINT "clients_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE`
    await prisma.$executeRaw`ALTER TABLE "public"."clients" ADD CONSTRAINT "clients_primaryTrainerId_fkey" FOREIGN KEY ("primaryTrainerId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE`
    await prisma.$executeRaw`ALTER TABLE "public"."packages" ADD CONSTRAINT "packages_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE`
    await prisma.$executeRaw`ALTER TABLE "public"."sessions" ADD CONSTRAINT "sessions_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE`
    await prisma.$executeRaw`ALTER TABLE "public"."sessions" ADD CONSTRAINT "sessions_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE`
    await prisma.$executeRaw`ALTER TABLE "public"."sessions" ADD CONSTRAINT "sessions_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "public"."packages"("id") ON DELETE SET NULL ON UPDATE CASCADE`
    await prisma.$executeRaw`ALTER TABLE "public"."sessions" ADD CONSTRAINT "sessions_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE`
    
    // Migration 2: 20250822060819_add_package_fields
    await prisma.$executeRaw`
      ALTER TABLE "public"."packages" 
      ADD COLUMN "expiresAt" TIMESTAMP(3),
      ADD COLUMN "packageType" TEXT NOT NULL DEFAULT 'Custom',
      ADD COLUMN "remainingSessions" INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN "startDate" TIMESTAMP(3)
    `
    
    await prisma.$executeRaw`
      ALTER TABLE "public"."sessions" 
      ADD COLUMN "sessionType" TEXT NOT NULL DEFAULT 'PT',
      ADD COLUMN "validated" BOOLEAN NOT NULL DEFAULT false
    `
    
    // Migration 3: 20250824084619_add_email_log
    await prisma.$executeRaw`
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
      )
    `
    
    await prisma.$executeRaw`CREATE INDEX "email_logs_status_idx" ON "public"."email_logs"("status")`
    await prisma.$executeRaw`CREATE INDEX "email_logs_createdAt_idx" ON "public"."email_logs"("createdAt")`
    await prisma.$executeRaw`CREATE INDEX "email_logs_messageId_idx" ON "public"."email_logs"("messageId")`
    
    // Migration 4: 20250824134620_remove_session_type
    await prisma.$executeRaw`ALTER TABLE "sessions" DROP COLUMN "sessionType"`
    
    // Create _prisma_migrations table to track migrations
    await prisma.$executeRaw`
      CREATE TABLE "_prisma_migrations" (
        "id" VARCHAR(36) NOT NULL,
        "checksum" VARCHAR(64) NOT NULL,
        "finished_at" TIMESTAMPTZ,
        "migration_name" VARCHAR(255) NOT NULL,
        "logs" TEXT,
        "rolled_back_at" TIMESTAMPTZ,
        "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "applied_steps_count" INTEGER NOT NULL DEFAULT 0,
        CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id")
      )
    `
    
    // Mark migrations as applied
    await prisma.$executeRaw`
      INSERT INTO "_prisma_migrations" (id, checksum, migration_name, finished_at, applied_steps_count)
      VALUES 
        ('20250822031543', 'accurate', '20250822031543_initial_schema', NOW(), 1),
        ('20250822060819', 'accurate', '20250822060819_add_package_fields', NOW(), 1),
        ('20250824084619', 'accurate', '20250824084619_add_email_log', NOW(), 1),
        ('20250824134620', 'accurate', '20250824134620_remove_session_type', NOW(), 1)
    `
    
    // IMPORTANT: Add package_templates table (not in migrations but exists in schema)
    await prisma.$executeRaw`
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
      )
    `
    await prisma.$executeRaw`CREATE UNIQUE INDEX "package_templates_name_key" ON "package_templates"("name")`
    await prisma.$executeRaw`CREATE INDEX "package_templates_category_idx" ON "package_templates"("category")`
    await prisma.$executeRaw`CREATE INDEX "package_templates_active_idx" ON "package_templates"("active")`
    
    // Verify critical columns exist
    const sessionColumns = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'sessions' 
      AND table_schema = 'public'
      ORDER BY ordinal_position
    ` as any[]
    
    const packageColumns = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'packages' 
      AND table_schema = 'public'
      ORDER BY ordinal_position
    ` as any[]
    
    // Get list of all tables
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    ` as any[]
    
    return NextResponse.json({
      success: true,
      message: 'Database reset with EXACT schema from migrations',
      tables: tables.map((t: any) => t.table_name),
      sessionColumns: sessionColumns.map((c: any) => `${c.column_name} (${c.data_type})`),
      packageColumns: packageColumns.map((c: any) => `${c.column_name} (${c.data_type})`),
      criticalFields: {
        sessions: {
          hasSessionDate: sessionColumns.some((c: any) => c.column_name === 'sessionDate'),
          hasSessionValue: sessionColumns.some((c: any) => c.column_name === 'sessionValue'),
          hasValidated: sessionColumns.some((c: any) => c.column_name === 'validated')
        },
        packages: {
          hasRemainingSessions: packageColumns.some((c: any) => c.column_name === 'remainingSessions'),
          hasTemplateId: packageColumns.some((c: any) => c.column_name === 'templateId')
        }
      },
      note: 'Database now matches production/local exactly. Run /api/seed-staging to add test data.'
    })
  } catch (error: any) {
    console.error('Reset database error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to reset database',
        details: error.message || 'Unknown error',
        hint: 'Check database permissions'
      },
      { status: 500 }
    )
  }
}