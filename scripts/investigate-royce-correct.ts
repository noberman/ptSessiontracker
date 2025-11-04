// Investigation script with correct production schema
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
  console.log('=' .repeat(60))
  
  try {
    // 1. Find Royce - users table has: id, email, password, name, role, active, organizationId
    const royce = await prisma.$queryRaw`
      SELECT id, name, email, role, "organizationId", active
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
    console.log(`   Organization ID: ${royceUser.organizationId}`)
    console.log(`   Active: ${royceUser.active}`)
    console.log('')
    
    // 2. Get Royce's locations via UserLocation join table
    const royceLocations = await prisma.$queryRaw`
      SELECT l.id, l.name
      FROM user_locations ul
      JOIN locations l ON l.id = ul."locationId"
      WHERE ul."userId" = ${royceUser.id}
    ` as any[]
    
    console.log(`📍 Royce's Locations: ${royceLocations.length}`)
    royceLocations.forEach((loc: any) => {
      console.log(`   - ${loc.name} (ID: ${loc.id})`)
    })
    console.log('')
    
    // 3. Find ALL clients in the organization
    console.log('📋 Clients in organization:')
    const allClients = await prisma.$queryRaw`
      SELECT 
        c.id, 
        c.name, 
        c.email, 
        c.active, 
        c."primaryTrainerId",
        c."locationId",
        l.name as location_name
      FROM clients c
      LEFT JOIN locations l ON l.id = c."locationId"
      WHERE c."organizationId" = ${royceUser.organizationId}
      ORDER BY c.name
    ` as any[]
    
    console.log(`Total clients in organization: ${allClients.length}`)
    
    // 4. Filter clients assigned to Royce
    const royceClients = allClients.filter((c: any) => c.primaryTrainerId === royceUser.id)
    console.log(`\n✅ Clients with Royce as primary trainer: ${royceClients.length}`)
    royceClients.forEach((c: any) => {
      console.log(`   - ${c.name} (${c.email})`)
      console.log(`     Location: ${c.location_name}, Active: ${c.active}`)
    })
    
    // 5. Find sessions with Royce
    console.log('\n📅 Analyzing Royce\'s sessions:')
    const sessions = await prisma.$queryRaw`
      SELECT 
        s.id,
        s."clientId",
        s."sessionDate",
        s.validated,
        c.name as client_name,
        c."primaryTrainerId",
        c.active as client_active
      FROM sessions s
      LEFT JOIN clients c ON c.id = s."clientId"
      WHERE s."trainerId" = ${royceUser.id}
        AND s.cancelled = false
      ORDER BY s."sessionDate" DESC
      LIMIT 30
    ` as any[]
    
    console.log(`Found ${sessions.length} recent non-cancelled sessions`)
    
    // Analyze unique clients in sessions
    const uniqueSessionClients = new Map()
    sessions.forEach((s: any) => {
      if (!uniqueSessionClients.has(s.clientId)) {
        uniqueSessionClients.set(s.clientId, {
          name: s.client_name,
          isPrimary: s.primaryTrainerId === royceUser.id,
          isActive: s.client_active
        })
      }
    })
    
    console.log(`Sessions with ${uniqueSessionClients.size} unique clients:`)
    
    let primaryCount = 0
    let coveringCount = 0
    let inactiveCount = 0
    
    uniqueSessionClients.forEach((client, clientId) => {
      const status = []
      
      if (client.isPrimary) {
        primaryCount++
        status.push('Primary')
      } else {
        coveringCount++
        status.push('Not Primary')
      }
      
      if (!client.isActive) {
        inactiveCount++
        status.push('Inactive')
      }
      
      const icon = client.isPrimary ? '✅' : '⚠️'
      console.log(`   ${icon} ${client.name || 'Unknown'} (${status.join(', ')})`)
    })
    
    // 6. Find the missing clients
    console.log('\n🔍 INVESTIGATING MISSING CLIENTS:')
    const sessionClientIds = Array.from(uniqueSessionClients.keys())
    const primaryClientIds = royceClients.map((c: any) => c.id)
    
    const missingClientIds = sessionClientIds.filter(id => !primaryClientIds.includes(id))
    
    if (missingClientIds.length > 0) {
      console.log(`Found ${missingClientIds.length} clients in sessions but NOT assigned to Royce:`)
      
      for (const clientId of missingClientIds) {
        const clientInfo = allClients.find((c: any) => c.id === clientId)
        if (clientInfo) {
          // Find who the client is assigned to
          let trainerName = 'No one'
          if (clientInfo.primaryTrainerId) {
            const trainer = await prisma.$queryRaw`
              SELECT name FROM users WHERE id = ${clientInfo.primaryTrainerId}
            ` as any[]
            if (trainer[0]) {
              trainerName = trainer[0].name
            }
          }
          
          console.log(`\n   Client: ${clientInfo.name}`)
          console.log(`   - Email: ${clientInfo.email}`)
          console.log(`   - Location: ${clientInfo.location_name}`)
          console.log(`   - Active: ${clientInfo.active}`)
          console.log(`   - Assigned to: ${trainerName} (ID: ${clientInfo.primaryTrainerId})`)
          console.log(`   ⚠️  But has sessions with Royce!`)
        }
      }
    }
    
    // 7. Summary and diagnosis
    console.log('\n' + '=' .repeat(60))
    console.log('📊 SUMMARY & DIAGNOSIS')
    console.log('=' .repeat(60))
    console.log(`Royce's Status:`)
    console.log(`  - ${royceClients.length} clients assigned as primary trainer`)
    console.log(`  - ${sessions.length} recent sessions`)
    console.log(`  - Sessions with ${uniqueSessionClients.size} unique clients`)
    console.log(`    • ${primaryCount} are his primary clients`)
    console.log(`    • ${coveringCount} assigned to other trainers`)
    console.log(`    • ${inactiveCount} inactive clients`)
    
    if (coveringCount > 0) {
      console.log('\n⚠️  ROOT CAUSE IDENTIFIED:')
      console.log('Royce has sessions with clients not assigned to him as primary trainer.')
      console.log('This explains why you see sessions but can\'t find the clients.')
      console.log('\nPOSSIBLE REASONS:')
      console.log('1. Royce is covering sessions for other trainers')
      console.log('2. Clients were reassigned after sessions were booked')
      console.log('3. Royce is a secondary trainer for these clients')
      console.log('\nSOLUTIONS:')
      console.log('1. Check if the client list UI has a "My Clients" filter that hides non-primary clients')
      console.log('2. Search for clients by name directly')
      console.log('3. Consider showing all clients with sessions, not just primary assignments')
    }
    
    // 8. List all active clients for debugging
    console.log('\n📋 ALL ACTIVE CLIENTS (for reference):')
    const activeClients = allClients.filter((c: any) => c.active)
    console.log(`Total: ${activeClients.length} active clients`)
    const first5 = activeClients.slice(0, 5)
    first5.forEach((c: any) => {
      const assigned = c.primaryTrainerId === royceUser.id ? ' ← ROYCE\'S CLIENT' : ''
      console.log(`   - ${c.name} (${c.location_name})${assigned}`)
    })
    if (activeClients.length > 5) {
      console.log(`   ... and ${activeClients.length - 5} more`)
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