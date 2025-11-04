// Simple investigation script for Royce's clients
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
})

async function investigate() {
  console.log('🔍 Investigating Royce and his clients...\n')
  
  try {
    // 1. Find Royce
    const royce = await prisma.$queryRaw`
      SELECT id, name, email, role, "organizationId", "locationId", active
      FROM users 
      WHERE name LIKE '%Royce%' OR name LIKE '%royce%'
      LIMIT 1
    ` as any[]
    
    if (!royce || royce.length === 0) {
      console.log('❌ Could not find Royce')
      return
    }
    
    const royceUser = royce[0]
    console.log('✅ Found Royce:')
    console.log(`   ID: ${royceUser.id}`)
    console.log(`   Name: ${royceUser.name}`)
    console.log(`   Email: ${royceUser.email}`)
    console.log(`   Role: ${royceUser.role}`)
    console.log(`   Org ID: ${royceUser.organizationId}`)
    console.log(`   Location ID: ${royceUser.locationId}`)
    console.log('')
    
    // 2. Find ALL clients in the same organization
    console.log('📋 All clients in organization:')
    const allClients = await prisma.$queryRaw`
      SELECT id, name, email, active, "primaryTrainerId", "locationId"
      FROM clients
      WHERE "organizationId" = ${royceUser.organizationId}
      ORDER BY name
    ` as any[]
    
    console.log(`Total clients in org: ${allClients.length}`)
    
    // 3. Find clients assigned to Royce
    const royceClients = allClients.filter((c: any) => c.primaryTrainerId === royceUser.id)
    console.log(`\n✅ Clients assigned to Royce: ${royceClients.length}`)
    royceClients.forEach((c: any) => {
      console.log(`   - ${c.name} (${c.email}) - Active: ${c.active}`)
    })
    
    // 4. Find sessions with Royce
    console.log('\n📅 Recent sessions with Royce:')
    const sessions = await prisma.$queryRaw`
      SELECT 
        s.id,
        s."clientId",
        s."sessionDate",
        c.name as client_name,
        c."primaryTrainerId"
      FROM sessions s
      LEFT JOIN clients c ON c.id = s."clientId"
      WHERE s."trainerId" = ${royceUser.id}
        AND s.cancelled = false
      ORDER BY s."sessionDate" DESC
      LIMIT 20
    ` as any[]
    
    console.log(`Found ${sessions.length} recent sessions`)
    
    // Get unique clients from sessions
    const uniqueSessionClients = new Map()
    sessions.forEach((s: any) => {
      if (!uniqueSessionClients.has(s.clientId)) {
        uniqueSessionClients.set(s.clientId, {
          name: s.client_name,
          isPrimary: s.primaryTrainerId === royceUser.id
        })
      }
    })
    
    console.log(`\nUnique clients in sessions: ${uniqueSessionClients.size}`)
    
    let primaryCount = 0
    let coveringCount = 0
    
    uniqueSessionClients.forEach((client, clientId) => {
      if (client.isPrimary) {
        primaryCount++
        console.log(`   ✅ ${client.name} (Primary)`)
      } else {
        coveringCount++
        console.log(`   ⚠️  ${client.name} (Covering for another trainer)`)
      }
    })
    
    // 5. Summary
    console.log('\n' + '=' .repeat(60))
    console.log('📊 SUMMARY')
    console.log('=' .repeat(60))
    console.log(`Royce has:`)
    console.log(`  - ${royceClients.length} clients assigned as primary trainer`)
    console.log(`  - ${sessions.length} recent sessions`)
    console.log(`  - Sessions with ${uniqueSessionClients.size} unique clients`)
    console.log(`    - ${primaryCount} are his primary clients`)
    console.log(`    - ${coveringCount} he's covering for other trainers`)
    
    if (coveringCount > 0) {
      console.log('\n⚠️  ISSUE IDENTIFIED:')
      console.log('Royce has sessions with clients not assigned to him.')
      console.log('This is why you see sessions but can\'t find the clients.')
      console.log('\nSOLUTION OPTIONS:')
      console.log('1. Check if the UI has a filter showing only "My Clients"')
      console.log('2. Look for an "All Clients" view option')
      console.log('3. These clients should appear when searching by name')
    }
    
    // 6. List all active clients for reference
    console.log('\n📋 ALL ACTIVE CLIENTS IN ORGANIZATION:')
    const activeClients = allClients.filter((c: any) => c.active)
    console.log(`Total active clients: ${activeClients.length}`)
    activeClients.forEach((c: any) => {
      const trainer = c.primaryTrainerId === royceUser.id ? ' (Royce)' : ''
      console.log(`   - ${c.name}${trainer}`)
    })
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

investigate().catch(console.error)