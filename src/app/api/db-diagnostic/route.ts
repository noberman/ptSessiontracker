import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export async function GET() {
  console.log('🔍 DB DIAGNOSTIC: Starting database diagnostic...')
  
  try {
    const results: any = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      databaseUrl: process.env.DATABASE_URL?.substring(0, 30) + '...',
    }
    
    // Check DATABASE_URL
    console.log('📊 DB DIAGNOSTIC: Checking DATABASE_URL...')
    console.log(`   URL starts with: ${process.env.DATABASE_URL?.substring(0, 30)}...`)
    
    // 1. Check migrations table
    console.log('📊 DB DIAGNOSTIC: Checking migrations...')
    try {
      const migrations = await prisma.$queryRaw`
        SELECT migration_name, finished_at 
        FROM _prisma_migrations 
        ORDER BY finished_at DESC 
        LIMIT 5
      ` as any[]
      
      results.migrations = migrations
      console.log(`   Found ${migrations.length} migrations`)
      migrations.forEach((m: any) => {
        console.log(`   - ${m.migration_name} at ${m.finished_at}`)
      })
    } catch (err: any) {
      console.error('❌ DB DIAGNOSTIC: Migration check failed:', err.message)
      results.migrationError = err.message
    }
    
    // 2. Check table schema
    console.log('📊 DB DIAGNOSTIC: Checking sessions table columns...')
    try {
      const columns = await prisma.$queryRaw`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'sessions' 
        AND column_name IN ('cancelled', 'cancelledAt', 'validated', 'id')
        ORDER BY column_name
      ` as any[]
      
      results.sessionColumns = columns
      console.log(`   Found ${columns.length} columns:`)
      columns.forEach((c: any) => {
        console.log(`   - ${c.column_name}: ${c.data_type}`)
      })
      
      // Specifically check for cancelled
      const hasCancelled = columns.some((c: any) => c.column_name === 'cancelled')
      const hasCancelledAt = columns.some((c: any) => c.column_name === 'cancelledAt')
      console.log(`   Has 'cancelled' column: ${hasCancelled}`)
      console.log(`   Has 'cancelledAt' column: ${hasCancelledAt}`)
      
      results.hasCancelledColumns = { cancelled: hasCancelled, cancelledAt: hasCancelledAt }
    } catch (err: any) {
      console.error('❌ DB DIAGNOSTIC: Column check failed:', err.message)
      results.columnError = err.message
    }
    
    // 3. Try raw query with cancelled columns
    console.log('📊 DB DIAGNOSTIC: Testing raw query with cancelled columns...')
    try {
      const testQuery = await prisma.$queryRaw`
        SELECT id, cancelled, cancelledAt 
        FROM sessions 
        LIMIT 1
      ` as any[]
      
      results.rawQuerySuccess = true
      results.rawQuerySample = testQuery[0] || 'No sessions found'
      console.log('   ✅ Raw query successful')
    } catch (err: any) {
      console.error('❌ DB DIAGNOSTIC: Raw query failed:', err.message)
      results.rawQuerySuccess = false
      results.rawQueryError = err.message
    }
    
    // 4. Try Prisma ORM query
    console.log('📊 DB DIAGNOSTIC: Testing Prisma ORM query...')
    try {
      const session = await prisma.session.findFirst({
        select: {
          id: true,
          cancelled: true,
          cancelledAt: true
        }
      })
      
      results.prismaQuerySuccess = true
      results.prismaQuerySample = session || 'No sessions found'
      console.log('   ✅ Prisma ORM query successful')
    } catch (err: any) {
      console.error('❌ DB DIAGNOSTIC: Prisma ORM failed:', err.message)
      results.prismaQuerySuccess = false
      results.prismaQueryError = err.message
    }
    
    // 5. Check Prisma client generation date
    console.log('📊 DB DIAGNOSTIC: Checking Prisma Client...')
    try {
      // Check if we can access the cancelled field type
      const typeCheck = {
        hasField: 'cancelled' in prisma.session.fields,
        clientVersion: (prisma as any)._clientVersion || 'unknown'
      }
      results.prismaClient = typeCheck
      console.log(`   Client version: ${typeCheck.clientVersion}`)
    } catch (err: any) {
      console.error('❌ DB DIAGNOSTIC: Client check failed:', err.message)
      results.prismaClientError = err.message
    }
    
    // 6. Database connection info
    console.log('📊 DB DIAGNOSTIC: Getting database info...')
    try {
      const dbInfo = await prisma.$queryRaw`
        SELECT current_database() as database, 
               current_schema() as schema,
               version() as version
      ` as any[]
      
      results.databaseInfo = dbInfo[0]
      console.log(`   Database: ${dbInfo[0].database}`)
      console.log(`   Schema: ${dbInfo[0].schema}`)
      console.log(`   Version: ${dbInfo[0].version?.substring(0, 50)}...`)
    } catch (err: any) {
      console.error('❌ DB DIAGNOSTIC: Database info failed:', err.message)
      results.dbInfoError = err.message
    }
    
    console.log('✅ DB DIAGNOSTIC: Complete')
    console.log('📋 Summary:', JSON.stringify(results, null, 2))
    
    return NextResponse.json(results, { status: 200 })
    
  } catch (error: any) {
    console.error('💥 DB DIAGNOSTIC: Fatal error:', error)
    return NextResponse.json({
      error: 'Diagnostic failed',
      message: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}