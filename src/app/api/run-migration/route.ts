import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export async function GET() {
  console.log('🔧 MIGRATION: Starting migration process...')
  
  try {
    // First, check current state
    console.log('📊 MIGRATION: Checking current migrations...')
    const currentMigrations = await prisma.$queryRaw`
      SELECT migration_name 
      FROM _prisma_migrations 
      ORDER BY finished_at DESC
    ` as any[]
    
    console.log('📊 MIGRATION: Current migrations:', currentMigrations.map((m: any) => m.migration_name))
    
    // Check if the migration already exists
    const hasCancelledMigration = currentMigrations.some(
      (m: any) => m.migration_name === '20250916015736_add_session_cancellation'
    )
    
    if (hasCancelledMigration) {
      return NextResponse.json({
        success: false,
        message: 'Migration already applied',
        migrations: currentMigrations.map((m: any) => m.migration_name)
      })
    }
    
    // Apply the migration manually
    console.log('🔧 MIGRATION: Adding cancelled columns to sessions table...')
    
    try {
      // Add the cancelled column with default false
      await prisma.$executeRaw`
        ALTER TABLE sessions 
        ADD COLUMN IF NOT EXISTS cancelled BOOLEAN NOT NULL DEFAULT false
      `
      console.log('✅ MIGRATION: Added cancelled column')
      
      // Add the cancelledAt column (nullable)
      await prisma.$executeRaw`
        ALTER TABLE sessions 
        ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3)
      `
      console.log('✅ MIGRATION: Added cancelledAt column')
      
      // Record the migration
      await prisma.$executeRaw`
        INSERT INTO _prisma_migrations (
          id,
          checksum,
          migration_name,
          started_at,
          finished_at,
          applied_steps_count
        ) VALUES (
          gen_random_uuid()::text,
          'manual_migration',
          '20250916015736_add_session_cancellation',
          NOW(),
          NOW(),
          2
        )
      `
      console.log('✅ MIGRATION: Recorded migration in history')
      
      // Verify the columns exist
      const verifyColumns = await prisma.$queryRaw`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'sessions' 
        AND column_name IN ('cancelled', 'cancelledAt')
      ` as any[]
      
      console.log('📊 MIGRATION: Verification - found columns:', verifyColumns)
      
      return NextResponse.json({
        success: true,
        message: 'Migration applied successfully',
        columnsAdded: verifyColumns,
        note: 'Please rebuild the application to regenerate Prisma client'
      })
      
    } catch (migrationError: any) {
      console.error('❌ MIGRATION: Failed to apply migration:', migrationError)
      
      // Check if columns already exist
      if (migrationError.message?.includes('already exists')) {
        return NextResponse.json({
          success: false,
          message: 'Columns already exist',
          error: migrationError.message
        })
      }
      
      throw migrationError
    }
    
  } catch (error: any) {
    console.error('❌ MIGRATION: Fatal error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      code: error.code
    }, { status: 500 })
  }
}