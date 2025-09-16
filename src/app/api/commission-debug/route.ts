import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export async function GET() {
  console.log('🔍 COMMISSION DEBUG: Starting comprehensive commission system check...')
  
  const results: any = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  }
  
  try {
    // 1. Check if commission_tiers table exists
    console.log('📊 COMMISSION DEBUG: Checking if commission_tiers table exists...')
    try {
      const tableExists = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'commission_tiers'
        ) as exists
      ` as any[]
      
      results.tableExists = tableExists[0]?.exists || false
      console.log(`   Table exists: ${results.tableExists}`)
    } catch (err: any) {
      console.error('❌ COMMISSION DEBUG: Error checking table existence:', err.message)
      results.tableExistsError = err.message
    }
    
    // 2. Check table structure
    console.log('📊 COMMISSION DEBUG: Checking commission_tiers columns...')
    try {
      const columns = await prisma.$queryRaw`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'commission_tiers'
        ORDER BY ordinal_position
      ` as any[]
      
      results.tableColumns = columns
      console.log(`   Found ${columns.length} columns:`)
      columns.forEach((col: any) => {
        console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`)
      })
    } catch (err: any) {
      console.error('❌ COMMISSION DEBUG: Error checking columns:', err.message)
      results.columnsError = err.message
    }
    
    // 3. Check if there's any data
    console.log('📊 COMMISSION DEBUG: Checking for existing data...')
    try {
      const count = await prisma.$queryRaw`
        SELECT COUNT(*) as count FROM commission_tiers
      ` as any[]
      
      results.rowCount = parseInt(count[0]?.count || '0')
      console.log(`   Row count: ${results.rowCount}`)
      
      if (results.rowCount > 0) {
        // Get the actual data
        const tiers = await prisma.$queryRaw`
          SELECT * FROM commission_tiers 
          ORDER BY "minSessions"
        ` as any[]
        
        results.existingTiers = tiers
        console.log('   Existing tiers:')
        tiers.forEach((tier: any) => {
          console.log(`   - ${tier.minSessions}-${tier.maxSessions || '∞'}: ${tier.percentage}%`)
        })
      } else {
        console.log('   ⚠️ Table is EMPTY - no commission tiers found!')
      }
    } catch (err: any) {
      console.error('❌ COMMISSION DEBUG: Error checking data:', err.message)
      results.dataError = err.message
    }
    
    // 4. Check migration history
    console.log('📊 COMMISSION DEBUG: Checking migration history...')
    try {
      const migrations = await prisma.$queryRaw`
        SELECT migration_name, finished_at, rolled_back_at
        FROM _prisma_migrations
        WHERE migration_name LIKE '%commission%'
        ORDER BY finished_at DESC
      ` as any[]
      
      results.commissionMigrations = migrations
      console.log(`   Found ${migrations.length} commission-related migrations:`)
      migrations.forEach((m: any) => {
        const status = m.rolled_back_at ? 'ROLLED BACK' : 'Applied'
        console.log(`   - ${m.migration_name}: ${status} at ${m.finished_at}`)
      })
    } catch (err: any) {
      console.error('❌ COMMISSION DEBUG: Error checking migrations:', err.message)
      results.migrationsError = err.message
    }
    
    // 5. Try using Prisma ORM
    console.log('📊 COMMISSION DEBUG: Testing Prisma ORM access...')
    try {
      const tierCount = await prisma.commissionTier.count()
      results.prismaCount = tierCount
      console.log(`   Prisma ORM count: ${tierCount}`)
      
      if (tierCount > 0) {
        const firstTier = await prisma.commissionTier.findFirst({
          orderBy: { minSessions: 'asc' }
        })
        results.prismaFirstTier = firstTier
        console.log(`   First tier via ORM: ${firstTier?.minSessions}-${firstTier?.maxSessions}: ${firstTier?.percentage}%`)
      }
    } catch (err: any) {
      console.error('❌ COMMISSION DEBUG: Prisma ORM error:', err.message)
      results.prismaError = err.message
    }
    
    // 6. Check if we can insert data
    console.log('📊 COMMISSION DEBUG: Checking if we can insert test data...')
    try {
      // First check if we have any data
      if (results.rowCount === 0) {
        console.log('   Table is empty, checking if we can insert...')
        
        // Try a test insert (we'll roll it back)
        await prisma.$executeRaw`
          INSERT INTO commission_tiers (id, "minSessions", "maxSessions", percentage, "createdAt", "updatedAt")
          VALUES (gen_random_uuid()::text, 999, 999, 99, NOW(), NOW())
        `
        
        // If we got here, insert worked
        results.canInsert = true
        console.log('   ✅ Test insert successful')
        
        // Clean up the test record
        await prisma.$executeRaw`
          DELETE FROM commission_tiers WHERE "minSessions" = 999
        `
        console.log('   ✅ Test record cleaned up')
      } else {
        results.canInsert = 'skipped - table has data'
        console.log('   Skipped insert test - table already has data')
      }
    } catch (err: any) {
      console.error('❌ COMMISSION DEBUG: Insert test failed:', err.message)
      results.insertError = err.message
      results.canInsert = false
    }
    
    // 7. Summary and recommendations
    console.log('\n📋 COMMISSION DEBUG: Analysis Summary')
    console.log('=====================================')
    
    if (results.tableExists && results.rowCount === 0) {
      results.diagnosis = 'EMPTY_TABLE'
      results.recommendation = 'Table exists but is empty. Need to insert default tier data.'
      console.log('❗ DIAGNOSIS: Empty commission_tiers table')
      console.log('💡 SOLUTION: Insert default tier data')
    } else if (results.tableExists && results.rowCount > 0) {
      results.diagnosis = 'TABLE_POPULATED'
      results.recommendation = 'Table exists with data. Check if data is correct.'
      console.log('✅ DIAGNOSIS: Table exists with data')
    } else if (!results.tableExists) {
      results.diagnosis = 'NO_TABLE'
      results.recommendation = 'Table does not exist. Migration needs to run.'
      console.log('❌ DIAGNOSIS: Table does not exist')
    } else {
      results.diagnosis = 'UNKNOWN'
      results.recommendation = 'Unable to determine state. Check error logs.'
      console.log('❓ DIAGNOSIS: Unknown state')
    }
    
    console.log('\n✅ COMMISSION DEBUG: Complete')
    return NextResponse.json(results, { status: 200 })
    
  } catch (error: any) {
    console.error('💥 COMMISSION DEBUG: Fatal error:', error)
    return NextResponse.json({
      error: 'Debug failed',
      message: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}