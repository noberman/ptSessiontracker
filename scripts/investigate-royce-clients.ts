import { prisma } from '@/lib/prisma'

async function investigateRoyceClients() {
  console.log('🔍 Investigating Royce and his clients on production...\n')
  
  try {
    // 1. Find Royce
    const royce = await prisma.user.findFirst({
      where: {
        OR: [
          { name: { contains: 'Royce' } },
          { name: 'Tan Guan Wei Royce' },
          { email: { contains: 'royce' } }
        ]
      },
      include: {
        organization: true,
        locations: {
          include: {
            location: true
          }
        }
      }
    })
    
    if (!royce) {
      console.log('❌ Could not find user Royce')
      return
    }
    
    console.log('✅ Found Royce:')
    console.log(`   - ID: ${royce.id}`)
    console.log(`   - Name: ${royce.name}`)
    console.log(`   - Email: ${royce.email}`)
    console.log(`   - Role: ${royce.role}`)
    console.log(`   - Organization: ${royce.organization?.name}`)
    console.log(`   - Locations: ${royce.locations.map(l => l.location.name).join(', ')}`)
    console.log('')
    
    // 2. Find clients assigned to Royce
    const assignedClients = await prisma.client.findMany({
      where: {
        primaryTrainerId: royce.id
      },
      include: {
        location: true,
        packages: true
      }
    })
    
    console.log(`📊 Clients with Royce as primary trainer: ${assignedClients.length}`)
    if (assignedClients.length > 0) {
      assignedClients.forEach(client => {
        console.log(`   - ${client.name} (${client.email})`)
        console.log(`     Location: ${client.location.name}`)
        console.log(`     Active: ${client.active}`)
        console.log(`     Packages: ${client.packages.length}`)
      })
    }
    console.log('')
    
    // 3. Find sessions with Royce
    const royceSessions = await prisma.session.findMany({
      where: {
        trainerId: royce.id
      },
      select: {
        id: true,
        clientId: true,
        sessionDate: true,
        validated: true,
        cancelled: true
      },
      orderBy: {
        sessionDate: 'desc'
      },
      take: 10
    })
    
    console.log(`📅 Recent sessions with Royce: ${royceSessions.length}`)
    
    // Get unique client IDs from sessions
    const uniqueClientIds = [...new Set(royceSessions.map(s => s.clientId))]
    console.log(`   Unique clients in sessions: ${uniqueClientIds.length}`)
    console.log('')
    
    // 4. Look up those clients
    if (uniqueClientIds.length > 0) {
      console.log('🔍 Looking up clients from sessions...')
      
      for (const clientId of uniqueClientIds) {
        const client = await prisma.client.findUnique({
          where: { id: clientId },
          include: {
            primaryTrainer: true,
            location: true,
            organization: true
          }
        })
        
        if (client) {
          console.log(`   ✅ Found client: ${client.name}`)
          console.log(`      - Email: ${client.email}`)
          console.log(`      - Primary Trainer: ${client.primaryTrainer?.name || 'NONE'}`)
          console.log(`      - Location: ${client.location.name}`)
          console.log(`      - Organization: ${client.organization?.name}`)
          console.log(`      - Active: ${client.active}`)
          
          // Check for data inconsistency
          if (client.primaryTrainerId !== royce.id) {
            console.log(`      ⚠️  ISSUE: Client's primary trainer is NOT Royce!`)
            console.log(`         Primary trainer ID: ${client.primaryTrainerId}`)
            console.log(`         But has sessions with Royce (ID: ${royce.id})`)
          }
        } else {
          console.log(`   ❌ Client ID ${clientId} not found (might be deleted)`)
        }
        console.log('')
      }
    }
    
    // 5. Check for organization/location mismatch
    console.log('🏢 Checking for organization/location issues...')
    
    // Find all clients in Royce's organization
    if (royce.organizationId) {
      const orgClients = await prisma.client.findMany({
        where: {
          organizationId: royce.organizationId
        },
        select: {
          id: true,
          name: true,
          primaryTrainerId: true,
          locationId: true
        }
      })
      
      console.log(`   Total clients Royce's organization: ${orgClients.length}`)
      
      // Check which ones Royce has sessions with but isn't primary trainer
      const royceSessionClientIds = new Set(royceSessions.map(s => s.clientId))
      const clientsWithSessionsButNotPrimary = orgClients.filter(c => 
        royceSessionClientIds.has(c.id) && c.primaryTrainerId !== royce.id
      )
      
      if (clientsWithSessionsButNotPrimary.length > 0) {
        console.log(`   ⚠️  Found ${clientsWithSessionsButNotPrimary.length} clients with Royce sessions but different primary trainer:`)
        clientsWithSessionsButNotPrimary.forEach(c => {
          console.log(`      - ${c.name} (Primary trainer: ${c.primaryTrainerId})`)
        })
      }
    }
    
    // 6. Check location access
    console.log('\n📍 Checking location access...')
    const royceLocationIds = royce.locations.map(l => l.locationId)
    console.log(`   Royce's locations: ${royceLocationIds.join(', ')}`)
    
    // Find clients in Royce's locations
    const locationClients = await prisma.client.findMany({
      where: {
        locationId: {
          in: royceLocationIds
        }
      },
      select: {
        id: true,
        name: true,
        locationId: true,
        primaryTrainerId: true
      }
    })
    
    console.log(`   Clients in Royce's locations: ${locationClients.length}`)
    const royceClientsInLocation = locationClients.filter(c => c.primaryTrainerId === royce.id)
    console.log(`   Assigned to Royce: ${royceClientsInLocation.length}`)
    
    // 7. Summary and recommendations
    console.log('\n📋 SUMMARY:')
    console.log('=' .repeat(50))
    console.log(`Royce (${royce.id}) has:`)
    console.log(`  - ${assignedClients.length} clients as primary trainer`)
    console.log(`  - Sessions with ${uniqueClientIds.length} unique clients`)
    console.log(`  - Access to ${royceLocationIds.length} location(s)`)
    
    if (uniqueClientIds.length > assignedClients.length) {
      console.log('\n⚠️  ISSUE DETECTED:')
      console.log('Royce has sessions with more clients than he\'s assigned as primary trainer.')
      console.log('Possible causes:')
      console.log('  1. Clients were reassigned to another trainer')
      console.log('  2. Royce is covering sessions for other trainers')
      console.log('  3. Data inconsistency between sessions and client assignments')
    }
    
  } catch (error) {
    console.error('Error during investigation:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the investigation
investigateRoyceClients()
  .then(() => console.log('\n✅ Investigation complete'))
  .catch(console.error)