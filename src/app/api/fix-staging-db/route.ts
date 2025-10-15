import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// TEMPORARY: Fix staging database schema
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
    // Create package_templates table if it doesn't exist
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS package_templates (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL UNIQUE,
        "displayName" TEXT NOT NULL,
        category TEXT NOT NULL,
        sessions INTEGER NOT NULL,
        price DOUBLE PRECISION NOT NULL,
        "sessionValue" DOUBLE PRECISION NOT NULL,
        active BOOLEAN DEFAULT true,
        "sortOrder" INTEGER DEFAULT 0,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )
    `

    // Create email_logs table if it doesn't exist
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS email_logs (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        "sessionId" TEXT NOT NULL,
        "clientEmail" TEXT NOT NULL,
        "emailType" TEXT NOT NULL,
        status TEXT NOT NULL,
        error TEXT,
        metadata JSONB,
        "sentAt" TIMESTAMP DEFAULT NOW(),
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )
    `

    // Fix locations table columns
    await prisma.$executeRaw`
      ALTER TABLE locations 
      ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT NOW()
    `

    // Check what tables exist
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    ` as any[]

    // Seed package templates if empty
    const templateCount = await prisma.packageTemplate.count()
    if (templateCount === 0) {
      // Add some default templates
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
          }
        ]
      })
    }
    
    return NextResponse.json({
      success: true,
      message: 'Database schema fixed and tables created',
      tables: tables.map((t: any) => t.table_name),
      templateCount: await prisma.packageTemplate.count(),
      note: 'All tables created, try seeding again'
    })
  } catch (error: any) {
    console.error('Fix database error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fix database',
        details: error.message || 'Unknown error',
        code: error.code
      },
      { status: 500 }
    )
  }
}