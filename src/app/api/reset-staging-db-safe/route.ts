import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// TEMPORARY: Safely reset staging database without DROP SCHEMA
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
    // Drop tables in correct order (respecting foreign keys)
    const dropTables = [
      'DROP TABLE IF EXISTS "email_logs" CASCADE',
      'DROP TABLE IF EXISTS "sessions" CASCADE',
      'DROP TABLE IF EXISTS "packages" CASCADE',
      'DROP TABLE IF EXISTS "clients" CASCADE',
      'DROP TABLE IF EXISTS "users" CASCADE',
      'DROP TABLE IF EXISTS "package_templates" CASCADE',
      'DROP TABLE IF EXISTS "locations" CASCADE',
      'DROP TABLE IF EXISTS "_prisma_migrations"',
      'DROP TYPE IF EXISTS "Role" CASCADE'
    ]

    // Drop each table
    for (const dropQuery of dropTables) {
      try {
        await prisma.$executeRawUnsafe(dropQuery)
      } catch (e: any) {
        console.log(`Could not drop: ${e.message}`)
      }
    }

    // Create enums
    await prisma.$executeRaw`
      CREATE TYPE "Role" AS ENUM ('TRAINER', 'CLUB_MANAGER', 'PT_MANAGER', 'ADMIN')
    `

    // Create locations table
    await prisma.$executeRaw`
      CREATE TABLE "locations" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
        "name" TEXT NOT NULL,
        "active" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
      )
    `
    await prisma.$executeRaw`CREATE UNIQUE INDEX "locations_name_key" ON "locations"("name")`

    // Create users table
    await prisma.$executeRaw`
      CREATE TABLE "users" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
        "email" TEXT NOT NULL,
        "password" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "role" "Role" NOT NULL DEFAULT 'TRAINER',
        "locationId" TEXT,
        "active" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "users_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "users_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE
      )
    `
    await prisma.$executeRaw`CREATE UNIQUE INDEX "users_email_key" ON "users"("email")`

    // Create clients table
    await prisma.$executeRaw`
      CREATE TABLE "clients" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
        "name" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "locationId" TEXT NOT NULL,
        "primaryTrainerId" TEXT NOT NULL,
        "active" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "clients_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "clients_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT "clients_primaryTrainerId_fkey" FOREIGN KEY ("primaryTrainerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `
    await prisma.$executeRaw`CREATE UNIQUE INDEX "clients_email_key" ON "clients"("email")`

    // Create package_templates table
    await prisma.$executeRaw`
      CREATE TABLE "package_templates" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
        "name" TEXT NOT NULL,
        "displayName" TEXT NOT NULL,
        "category" TEXT NOT NULL,
        "sessions" INTEGER NOT NULL,
        "price" DOUBLE PRECISION NOT NULL,
        "sessionValue" DOUBLE PRECISION NOT NULL,
        "active" BOOLEAN NOT NULL DEFAULT true,
        "sortOrder" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "package_templates_pkey" PRIMARY KEY ("id")
      )
    `
    await prisma.$executeRaw`CREATE UNIQUE INDEX "package_templates_name_key" ON "package_templates"("name")`

    // Create packages table
    await prisma.$executeRaw`
      CREATE TABLE "packages" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
        "name" TEXT NOT NULL,
        "clientId" TEXT NOT NULL,
        "templateId" TEXT,
        "totalSessions" INTEGER NOT NULL,
        "remainingSessions" INTEGER NOT NULL,
        "price" DOUBLE PRECISION NOT NULL,
        "startDate" TIMESTAMP(3) NOT NULL,
        "expirationDate" TIMESTAMP(3),
        "active" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "packages_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "packages_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "packages_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "package_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE
      )
    `

    // Create sessions table
    await prisma.$executeRaw`
      CREATE TABLE "sessions" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
        "trainerId" TEXT NOT NULL,
        "clientId" TEXT NOT NULL,
        "packageId" TEXT,
        "locationId" TEXT NOT NULL,
        "sessionDate" TIMESTAMP(3) NOT NULL,
        "sessionValue" DOUBLE PRECISION NOT NULL,
        "validated" BOOLEAN NOT NULL DEFAULT false,
        "validatedAt" TIMESTAMP(3),
        "validationToken" TEXT,
        "validationExpiry" TIMESTAMP(3),
        "notes" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "sessions_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "sessions_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "sessions_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT "sessions_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "packages"("id") ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT "sessions_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `
    await prisma.$executeRaw`CREATE UNIQUE INDEX "sessions_validationToken_key" ON "sessions"("validationToken")`

    // Create email_logs table
    await prisma.$executeRaw`
      CREATE TABLE "email_logs" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
        "sessionId" TEXT NOT NULL,
        "clientEmail" TEXT NOT NULL,
        "emailType" TEXT NOT NULL,
        "status" TEXT NOT NULL,
        "error" TEXT,
        "metadata" JSONB,
        "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "email_logs_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `

    // Create _prisma_migrations table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
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

    // Clear and re-add migration records
    await prisma.$executeRaw`DELETE FROM "_prisma_migrations"`
    await prisma.$executeRaw`
      INSERT INTO "_prisma_migrations" (id, checksum, migration_name, finished_at, applied_steps_count)
      VALUES 
        ('20250822031543', 'dummy', '20250822031543_initial_schema', NOW(), 1),
        ('20250822060819', 'dummy', '20250822060819_add_package_fields', NOW(), 1),
        ('20250824084619', 'dummy', '20250824084619_add_email_log', NOW(), 1),
        ('20250824134620', 'dummy', '20250824134620_remove_session_type', NOW(), 1)
    `

    // Add default package templates
    await prisma.packageTemplate.createMany({
      data: [
        {
          name: 'single-session',
          displayName: 'Single Session',
          category: 'Individual',
          sessions: 1,
          price: 80,
          sessionValue: 80,
          sortOrder: 1
        },
        {
          name: '5-pack',
          displayName: '5 Session Package',
          category: 'Package',
          sessions: 5,
          price: 375,
          sessionValue: 75,
          sortOrder: 2
        },
        {
          name: '10-pack',
          displayName: '10 Session Package',
          category: 'Package',
          sessions: 10,
          price: 700,
          sessionValue: 70,
          sortOrder: 3
        },
        {
          name: '20-pack',
          displayName: '20 Session Package',
          category: 'Package',
          sessions: 20,
          price: 1300,
          sessionValue: 65,
          sortOrder: 4
        },
        {
          name: 'monthly-unlimited',
          displayName: 'Monthly Unlimited',
          category: 'Membership',
          sessions: 999,
          price: 500,
          sessionValue: 50,
          sortOrder: 5
        }
      ],
      skipDuplicates: true
    })

    // Get list of created tables
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    ` as any[]

    const templateCount = await prisma.packageTemplate.count()

    return NextResponse.json({
      success: true,
      message: 'Database safely reset with all tables',
      tables: tables.map((t: any) => t.table_name),
      packageTemplatesCreated: templateCount,
      note: 'Database ready. Run /api/seed-staging to add test accounts.'
    })
  } catch (error: any) {
    console.error('Reset database error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to reset database',
        details: error.message || 'Unknown error',
        code: error.code
      },
      { status: 500 }
    )
  }
}