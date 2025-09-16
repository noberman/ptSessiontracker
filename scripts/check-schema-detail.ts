import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkSchemaDetail() {
  try {
    console.log('🔍 Checking Schema Details...\n')
    
    // Check all columns in sessions table
    const columns = await prisma.$queryRaw`
      SELECT 
        table_schema,
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'sessions'
      ORDER BY ordinal_position
    ` as any[]
    
    console.log('📋 Sessions Table Structure:')
    console.log('===========================')
    columns.forEach((col: any) => {
      console.log(`Schema: ${col.table_schema}`)
      console.log(`Column: ${col.column_name}`)
      console.log(`Type: ${col.data_type}`)
      console.log(`Nullable: ${col.is_nullable}`)
      console.log(`Default: ${col.column_default || 'none'}`)
      console.log('---')
    })
    
    // Try to query with cancelled column
    console.log('\n🔍 Testing Direct Query:')
    try {
      const result = await prisma.$queryRaw`
        SELECT id, cancelled, cancelledAt 
        FROM sessions 
        LIMIT 1
      ` as any[]
      console.log('✅ Direct query successful!')
      if (result.length > 0) {
        console.log('Sample row:', result[0])
      }
    } catch (err: any) {
      console.log('❌ Direct query failed:', err.message)
    }
    
    // Try with Prisma ORM
    console.log('\n🔍 Testing Prisma ORM:')
    try {
      const session = await prisma.session.findFirst({
        select: {
          id: true,
          cancelled: true,
          cancelledAt: true
        }
      })
      console.log('✅ Prisma ORM query successful!')
      console.log('Sample:', session)
    } catch (err: any) {
      console.log('❌ Prisma ORM failed:', err.message)
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkSchemaDetail()