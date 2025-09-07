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
    // Check if locations table exists and has active column
    const checkTable = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'locations' 
      AND column_name = 'active'
    ` as any[]

    if (checkTable.length === 0) {
      // Add missing column if it doesn't exist
      await prisma.$executeRaw`
        ALTER TABLE locations 
        ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true
      `
    }

    // Check for other potentially missing columns
    await prisma.$executeRaw`
      ALTER TABLE locations 
      ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT NOW()
    `

    // Run a test query to verify
    const locations = await prisma.location.findMany()
    
    return NextResponse.json({
      success: true,
      message: 'Database schema fixed',
      locationsCount: locations.length,
      note: 'Now try the seed endpoint again'
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