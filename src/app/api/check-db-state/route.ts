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
    // Check what tables exist
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    ` as any[]

    // Check sessions table columns if it exists
    let sessionColumns: any[] = []
    const hasSessionsTable = tables.some((t: any) => t.table_name === 'sessions')
    
    if (hasSessionsTable) {
      sessionColumns = await prisma.$queryRaw`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'sessions' 
        AND table_schema = 'public'
        ORDER BY ordinal_position
      ` as any[]
    }

    // Check what migrations Prisma thinks are applied
    let migrations: any[] = []
    const hasMigrationsTable = tables.some((t: any) => t.table_name === '_prisma_migrations')
    
    if (hasMigrationsTable) {
      migrations = await prisma.$queryRaw`
        SELECT migration_name, finished_at, applied_steps_count 
        FROM _prisma_migrations 
        ORDER BY migration_name
      ` as any[]
    }

    return NextResponse.json({
      tables: tables.map((t: any) => t.table_name),
      sessionColumns: sessionColumns.map((c: any) => `${c.column_name} (${c.data_type})`),
      migrations: migrations.map((m: any) => ({
        name: m.migration_name,
        finished: m.finished_at,
        steps: m.applied_steps_count
      })),
      criticalCheck: {
        hasSessionsTable,
        hasCorrectColumns: sessionColumns.some((c: any) => c.column_name === 'sessionDate'),
        columnNames: sessionColumns.map((c: any) => c.column_name)
      }
    })
  } catch (error: any) {
    return NextResponse.json(
      { 
        error: 'Failed to check database state',
        details: error.message
      },
      { status: 500 }
    )
  }
}