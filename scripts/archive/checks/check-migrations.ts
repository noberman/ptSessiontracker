import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkMigrations() {
  try {
    console.log('🔍 Checking Production Migrations...\n')
    
    // Check migrations table
    const migrations = await prisma.$queryRaw`
      SELECT * FROM _prisma_migrations 
      ORDER BY started_at DESC
    ` as any[]
    
    console.log('📋 Applied Migrations:')
    console.log('====================')
    migrations.forEach((m: any) => {
      console.log(`✅ ${m.migration_name}`)
      console.log(`   Applied: ${m.finished_at || 'In Progress'}`)
      console.log(`   Success: ${m.rolled_back_at ? 'ROLLED BACK' : 'Yes'}`)
      console.log('')
    })
    
    // Check if cancelled columns exist
    try {
      const checkColumns = await prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'sessions' 
        AND column_name IN ('cancelled', 'cancelledAt')
      ` as any[]
      
      console.log('🔍 Session Table Columns:')
      console.log('========================')
      if (checkColumns.length === 0) {
        console.log('❌ Missing columns: cancelled, cancelledAt')
      } else {
        checkColumns.forEach((col: any) => {
          console.log(`✅ Found column: ${col.column_name}`)
        })
      }
    } catch (err) {
      console.log('❌ Error checking columns:', err)
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkMigrations()