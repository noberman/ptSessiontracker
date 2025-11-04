// Production-safe investigation script for Royce's missing clients
// This script avoids commission v2 fields that don't exist in production yet

import { PrismaClient } from '@prisma/client'

// Create a separate Prisma instance to avoid any schema issues
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
})

async function investigateRoyceClients() {
  console.log('🔍 Investigating Royce and his "missing" clients on production...\n')
  console.log('=' .repeat(60))
  
  try {
    // 1. Find Royce
    const royce = await prisma.user.findFirst({
      where: {
        OR: [
          { name: { contains: 'Royce' } },
          { name: 'Tan Guan Wei Royce' }
        ]
      }
    })
    
    if (!royce) {
      console.log('❌ Could not find user Royce')
      return
    }
    
    console.log('✅ Found Royce:')
    console.log(`   ID: ${royce.id}`)
    console.log(`   Name: ${royce.name}`)
    console.log(`   Email: ${royce.email}`)
    console.log(`   Role: ${royce.role}`)
    console.log(`   Organization ID: ${royce.organizationId}`)
    console.log(`   Location ID: ${royce.locationId}`)
    console.log(`   Active: ${royce.active}`)
    console.log('')
    
    // 2. Get Royce's organization and location details
    const [organization, location] = await Promise.all([
      royce.organizationId ? prisma.organization.findUnique({
        where: { id: royce.organizationId }
      }) : null,
      royce.locationId ? prisma.location.findUnique({
        where: { id: royce.locationId }
      }) : null
    ])
    
    console.log('🏢 Context:')
    console.log(`   Organization: ${organization?.name || 'NONE'}`)
    console.log(`   Primary Location: ${location?.name || 'NONE'}`)
    
    // Check for multi-location access
    const userLocations = await prisma.userLocation.findMany({
      where: { userId: royce.id },
      include: { location: true }
    })
    
    if (userLocations.length > 0) {
      console.log(`   Additional Locations (${userLocations.length}):`)
      userLocations.forEach(ul => {
        console.log(`     - ${ul.location.name} (ID: ${ul.locationId})`)
      })
    }
    console.log('')
    
    // 3. Get recent sessions to find clients
    console.log('📅 Fetching Royce\'s recent sessions...')
    const recentSessions = await prisma.session.findMany({
      where: {
        trainerId: royce.id,
        cancelled: false
      },
      orderBy: { sessionDate: 'desc' },
      take: 20,
      select: {
        id: true,
        clientId: true,
        sessionDate: true,
        validated: true,
        sessionType: true,
        locationId: true
      }
    })
    
    console.log(`   Found ${recentSessions.length} recent non-cancelled sessions`)
    
    // Get unique client IDs
    const uniqueClientIds = [...new Set(recentSessions.map(s => s.clientId))]
    console.log(`   Unique clients in these sessions: ${uniqueClientIds.length}`)
    console.log('')
    
    // 4. Look up each client and diagnose why they might be "missing"
    console.log('🔍 Investigating each client from sessions...')
    console.log('=' .repeat(60))
    
    const clientIssues = {
      notFound: 0,
      inactive: 0,
      differentOrg: 0,
      differentLocation: 0,
      notPrimaryTrainer: 0,
      noIssues: 0
    }
    
    for (const clientId of uniqueClientIds) {
      const client = await prisma.client.findUnique({
        where: { id: clientId },
        include: {
          location: true,
          organization: true,
          primaryTrainer: {
            select: {
              id: true,
              name: true
            }
          }
        }
      })
      
      console.log(`\n📋 Client ID: ${clientId}`)
      
      if (!client) {
        console.log('   ❌ CLIENT NOT FOUND IN DATABASE')
        clientIssues.notFound++
        continue
      }
      
      console.log(`   Name: ${client.name}`)
      console.log(`   Email: ${client.email}`)
      
      const issues = []
      
      // Check various potential issues
      if (!client.active) {
        issues.push('INACTIVE')
        clientIssues.inactive++
      }
      
      if (client.organizationId !== royce.organizationId) {
        issues.push(`DIFFERENT ORG (Client: ${client.organization?.name}, Royce: ${organization?.name})`)
        clientIssues.differentOrg++
      }
      
      // Check if client's location matches any of Royce's locations
      const royceLocationIds = [royce.locationId, ...userLocations.map(ul => ul.locationId)].filter(Boolean)
      if (!royceLocationIds.includes(client.locationId)) {
        issues.push(`DIFFERENT LOCATION (Client: ${client.location.name}, Royce: ${location?.name})`)
        clientIssues.differentLocation++
      }
      
      if (client.primaryTrainerId !== royce.id) {
        issues.push(`NOT PRIMARY TRAINER (Assigned to: ${client.primaryTrainer?.name || 'NONE'})`)
        clientIssues.notPrimaryTrainer++
      }
      
      if (issues.length === 0) {
        console.log('   ✅ NO ISSUES FOUND')
        clientIssues.noIssues++
      } else {
        console.log('   ⚠️  ISSUES FOUND:')
        issues.forEach(issue => console.log(`      - ${issue}`))
      }
      
      // Show additional details
      console.log(`   Details:`)
      console.log(`      Active: ${client.active}`)
      console.log(`      Organization: ${client.organization?.name || 'NONE'} (ID: ${client.organizationId})`)
      console.log(`      Location: ${client.location.name} (ID: ${client.locationId})`)
      console.log(`      Primary Trainer: ${client.primaryTrainer?.name || 'NONE'} (ID: ${client.primaryTrainerId})`)
    }
    
    // 5. Summary
    console.log('\n' + '=' .repeat(60))
    console.log('📊 SUMMARY')
    console.log('=' .repeat(60))
    console.log(`Total unique clients from sessions: ${uniqueClientIds.length}`)
    console.log(`  - Not found in database: ${clientIssues.notFound}`)
    console.log(`  - Inactive: ${clientIssues.inactive}`)
    console.log(`  - Different organization: ${clientIssues.differentOrg}`)
    console.log(`  - Different location: ${clientIssues.differentLocation}`)
    console.log(`  - Not Royce's primary clients: ${clientIssues.notPrimaryTrainer}`)
    console.log(`  - No issues found: ${clientIssues.noIssues}`)
    
    // 6. Query to find clients that SHOULD show up for Royce
    console.log('\n🔍 Clients that SHOULD be visible to Royce:')
    const visibleClients = await prisma.client.findMany({
      where: {
        AND: [
          { active: true },
          { organizationId: royce.organizationId },
          {
            OR: [
              { primaryTrainerId: royce.id },
              { locationId: { in: royceLocationIds } }
            ]
          }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        primaryTrainerId: true
      }
    })
    
    console.log(`Found ${visibleClients.length} clients that should be visible`)
    const roycesPrimaryClients = visibleClients.filter(c => c.primaryTrainerId === royce.id)
    console.log(`  - Assigned to Royce as primary: ${roycesPrimaryClients.length}`)
    console.log(`  - In Royce's locations but not assigned: ${visibleClients.length - roycesPrimaryClients.length}`)
    
    if (roycesPrimaryClients.length > 0) {
      console.log('\nRoyce\'s primary clients:')
      roycesPrimaryClients.forEach(c => {
        console.log(`  - ${c.name} (${c.email})`)
      })
    }
    
    // 7. Diagnosis
    console.log('\n' + '=' .repeat(60))
    console.log('🔬 DIAGNOSIS')
    console.log('=' .repeat(60))
    
    if (clientIssues.notPrimaryTrainer > 0) {
      console.log('⚠️  MAIN ISSUE: Royce has sessions with clients who are not assigned to him')
      console.log('   This could happen when:')
      console.log('   1. Royce is covering for another trainer')
      console.log('   2. Clients were reassigned after sessions were created')
      console.log('   3. Royce can see sessions but not the clients in the UI')
      console.log('\n   SOLUTION: The UI might be filtering to show only primary clients.')
      console.log('   Check if there\'s a "Show all clients" option in the client list.')
    }
    
    if (clientIssues.differentLocation > 0) {
      console.log('\n⚠️  LOCATION ISSUE: Some clients are in locations Royce doesn\'t have access to')
      console.log('   This prevents them from showing in his client list.')
      console.log('   SOLUTION: Add Royce to those locations via UserLocation table.')
    }
    
    if (clientIssues.inactive > 0) {
      console.log('\n⚠️  INACTIVE CLIENTS: Some clients are marked as inactive')
      console.log('   But they still have sessions showing up.')
      console.log('   SOLUTION: Reactivate these clients or hide their sessions.')
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