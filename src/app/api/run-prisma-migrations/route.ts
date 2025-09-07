import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { prisma } from '@/lib/prisma'

const execAsync = promisify(exec)

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
    // Step 1: Drop EVERYTHING and start fresh
    console.log('Dropping all tables...')
    await prisma.$executeRaw`DROP SCHEMA public CASCADE`
    await prisma.$executeRaw`CREATE SCHEMA public`
    
    // Step 2: Run actual Prisma migrations
    console.log('Running Prisma migrations...')
    const { stdout, stderr } = await execAsync('npx prisma migrate deploy')
    
    // No need to add anything manually anymore - the new migration includes everything!
    
    // Step 3: Verify the schema is correct
    const sessionColumns = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'sessions' 
      AND table_schema = 'public'
      ORDER BY ordinal_position
    ` as any[]
    
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    ` as any[]
    
    return NextResponse.json({
      success: true,
      message: 'Prisma migrations applied successfully',
      migrationOutput: stdout,
      migrationErrors: stderr,
      tables: tables.map((t: any) => t.table_name),
      sessionColumns: sessionColumns.map((c: any) => c.column_name),
      verification: {
        hasSessionDate: sessionColumns.some((c: any) => c.column_name === 'sessionDate'),
        hasSessionValue: sessionColumns.some((c: any) => c.column_name === 'sessionValue'),
        hasValidated: sessionColumns.some((c: any) => c.column_name === 'validated')
      }
    })
  } catch (error: any) {
    console.error('Migration error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to run migrations',
        details: error.message,
        stdout: error.stdout,
        stderr: error.stderr
      },
      { status: 500 }
    )
  }
}