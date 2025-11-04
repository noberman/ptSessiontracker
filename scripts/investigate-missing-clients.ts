// Investigation for specific missing clients: Evie and Samuel
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
})

async function investigate() {
  console.log('🔍 Investigating why Evie and Samuel don\'t appear in search...\n')
  console.log('=' .repeat(60))
  
  try {
    // 1. Search for Evie and Samuel in clients table
    console.log('📋 Searching for Evie and Samuel in clients table:')
    
    const searchResults = await prisma.$queryRaw`
      SELECT 
        id,
        name,
        email,
        active,
        "organizationId",
        "locationId",
        "primaryTrainerId",
        "createdAt",
        "updatedAt",
        "isDemo"
      FROM clients
      WHERE 
        LOWER(name) LIKE '%evie%'
        OR LOWER(name) LIKE '%samuel%'
        OR LOWER(name) LIKE '%singka%'
        OR LOWER(name) LIKE '%raj%'
      ORDER BY name
    ` as any[]
    
    console.log(`Found ${searchResults.length} matching clients:\n`)
    
    searchResults.forEach((client: any) => {
      console.log(`Client: ${client.name}`)
      console.log(`  ID: ${client.id}`)
      console.log(`  Email: ${client.email}`)
      console.log(`  Active: ${client.active}`)
      console.log(`  Organization ID: ${client.organizationId}`)
      console.log(`  Location ID: ${client.locationId}`)
      console.log(`  Primary Trainer ID: ${client.primaryTrainerId}`)
      console.log(`  Is Demo: ${client.isDemo}`)
      console.log(`  Created: ${client.createdAt}`)
      console.log('')
    })
    
    // 2. Look for these clients via their sessions
    console.log('📅 Finding clients through Royce\'s sessions:')
    
    const royceId = 'cmfddbr620007pj0fhvggoyab' // Royce's ID from previous investigation
    
    const sessionClients = await prisma.$queryRaw`
      SELECT DISTINCT
        c.id,
        c.name,
        c.email,
        c.active,
        c."organizationId",
        c."locationId",
        c."primaryTrainerId",
        c."isDemo",
        COUNT(s.id) as session_count
      FROM sessions s
      JOIN clients c ON c.id = s."clientId"
      WHERE 
        s."trainerId" = ${royceId}
        AND s.cancelled = false
        AND (
          LOWER(c.name) LIKE '%evie%'
          OR LOWER(c.name) LIKE '%samuel%'
        )
      GROUP BY c.id, c.name, c.email, c.active, c."organizationId", c."locationId", c."primaryTrainerId", c."isDemo"
    ` as any[]
    
    console.log(`\nFound ${sessionClients.length} clients with sessions:`)
    
    sessionClients.forEach((client: any) => {
      console.log(`\nClient: ${client.name}`)
      console.log(`  ID: ${client.id}`)
      console.log(`  Email: ${client.email}`)
      console.log(`  Sessions with Royce: ${client.session_count}`)
      console.log(`  Active: ${client.active}`)
      console.log(`  Organization ID: ${client.organizationId}`)
      console.log(`  Location ID: ${client.locationId}`)
      console.log(`  Primary Trainer: ${client.primaryTrainerId}`)
      console.log(`  Is Demo: ${client.isDemo}`)
    })
    
    // 3. Check if these are the only instances of these names
    console.log('\n🔍 Checking for duplicate or similar names:')
    
    const nameVariations = await prisma.$queryRaw`
      SELECT 
        name,
        COUNT(*) as count
      FROM clients
      WHERE 
        LOWER(name) LIKE '%evi%'
        OR LOWER(name) LIKE '%samuel%'
        OR LOWER(name) LIKE '%sam%'
      GROUP BY name
      ORDER BY name
    ` as any[]
    
    console.log(`\nName variations found:`)
    nameVariations.forEach((n: any) => {
      console.log(`  - "${n.name}" (${n.count} client${n.count > 1 ? 's' : ''})`)
    })
    
    // 4. Check Royce's organization ID
    const expectedOrgId = 'cmftlg7gx0000rp0ci4as72j0' // From the users table screenshot
    
    console.log('\n📊 Analysis:')
    console.log(`Expected Organization ID: ${expectedOrgId}`)
    
    // Check if clients are in different org
    if (sessionClients.length > 0) {
      sessionClients.forEach((client: any) => {
        if (client.organizationId !== expectedOrgId) {
          console.log(`\n⚠️ ISSUE: ${client.name} is in a different organization!`)
          console.log(`  Client's org: ${client.organizationId}`)
          console.log(`  Expected org: ${expectedOrgId}`)
        }
      })
    }
    
    // 5. Check location access
    console.log('\n📍 Checking location access:')
    
    const royceLocations = await prisma.$queryRaw`
      SELECT "locationId"
      FROM user_locations
      WHERE "userId" = ${royceId}
    ` as any[]
    
    const royceLocationIds = royceLocations.map((l: any) => l.locationId)
    console.log(`Royce has access to locations: ${royceLocationIds.join(', ')}`)
    
    if (sessionClients.length > 0) {
      sessionClients.forEach((client: any) => {
        if (!royceLocationIds.includes(client.locationId)) {
          console.log(`\n⚠️ LOCATION ISSUE: ${client.name}`)
          console.log(`  Client's location: ${client.locationId}`)
          console.log(`  Not in Royce's locations!`)
        }
      })
    }
    
    // 6. Final diagnosis
    console.log('\n' + '=' .repeat(60))
    console.log('🔬 DIAGNOSIS')
    console.log('=' .repeat(60))
    
    if (searchResults.length === 0 && sessionClients.length === 0) {
      console.log('❌ These clients do not exist in the database at all!')
      console.log('   Possible causes:')
      console.log('   1. They were deleted')
      console.log('   2. The names are different than expected')
      console.log('   3. Data corruption')
    } else if (searchResults.length > 0 || sessionClients.length > 0) {
      console.log('✅ Clients exist in the database')
      console.log('\nPossible reasons they don\'t show in UI:')
      console.log('1. They are marked as isDemo = true (demo data)')
      console.log('2. They are in a different organization')
      console.log('3. They are in locations Royce doesn\'t have access to')
      console.log('4. They are inactive (active = false)')
      console.log('5. UI search is case-sensitive or has special filters')
      console.log('6. UI is caching old data')
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

investigate()
  .then(() => console.log('\n✅ Investigation complete'))
  .catch(console.error)