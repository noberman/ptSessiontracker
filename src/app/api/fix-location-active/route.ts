import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
    // Check current columns
    const beforeColumns = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'locations' 
      AND table_schema = 'public'
      ORDER BY ordinal_position
    ` as any[]
    
    // Add active column if it doesn't exist
    await prisma.$executeRaw`
      ALTER TABLE "public"."locations" 
      ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true
    `
    
    // Add unique constraint if it doesn't exist
    await prisma.$executeRaw`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'locations_name_key'
        ) THEN
          CREATE UNIQUE INDEX locations_name_key ON public.locations(name);
        END IF;
      END $$;
    `
    
    // Check columns after
    const afterColumns = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'locations' 
      AND table_schema = 'public'
      ORDER BY ordinal_position
    ` as any[]
    
    return NextResponse.json({
      success: true,
      message: 'Fixed locations table',
      beforeColumns: beforeColumns.map((c: any) => c.column_name),
      afterColumns: afterColumns.map((c: any) => c.column_name),
      activeAdded: !beforeColumns.some((c: any) => c.column_name === 'active') && 
                   afterColumns.some((c: any) => c.column_name === 'active')
    })
  } catch (error: any) {
    return NextResponse.json(
      { 
        error: 'Failed to fix locations table',
        details: error.message
      },
      { status: 500 }
    )
  }
}