// Raw SQL investigation script that bypasses Prisma schema
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
})

async function investigateRoyceClients() {
  console.log('🔍 Investigating Royce using raw SQL queries...\n')
  console.log('=' .repeat(60))
  
  try {
    // 1. Find Royce using raw SQL
    const royceQuery = await prisma.$queryRaw`
      SELECT id, name, email, role, organization_id, location_id, active
      FROM users 
      WHERE name LIKE '%Royce%' 
      OR name = 'Tan Guan Wei Royce'
      LIMIT 1
    ` as any[]
    
    if (!royceQuery || royceQuery.length === 0) {
      console.log('❌ Could not find user Royce')
      return
    }
    
    const royce = royceQuery[0]
    console.log('✅ Found Royce:')
    console.log(`   ID: ${royce.id}`)
    console.log(`   Name: ${royce.name}`)
    console.log(`   Email: ${royce.email}`)
    console.log(`   Role: ${royce.role}`)
    console.log(`   Organization ID: ${royce.organizationId}`)
    console.log(`   Location ID: ${royce.locationId}`)
    console.log(`   Active: ${royce.active}`)
    console.log('')
    
    // 2. Get organization and location names
    const orgResult = royce.organizationId ? await prisma.$queryRaw`
      SELECT name FROM organizations WHERE id = ${royce.organizationId}
    ` as any[] : []
    
    const locResult = royce.locationId ? await prisma.$queryRaw`
      SELECT name FROM locations WHERE id = ${royce.locationId}
    ` as any[] : []
    
    console.log('🏢 Context:')
    console.log(`   Organization: ${orgResult[0]?.name || 'NONE'}`)
    console.log(`   Primary Location: ${locResult[0]?.name || 'NONE'}`)
    
    // Check multi-location access
    const userLocations = await prisma.$queryRaw`
      SELECT ul."locationId", l.name 
      FROM user_locations ul
      JOIN locations l ON l.id = ul."locationId"
      WHERE ul."userId" = ${royce.id}
    ` as any[]
    
    if (userLocations.length > 0) {
      console.log(`   Additional Locations (${userLocations.length}):`)
      userLocations.forEach((ul: any) => {
        console.log(`     - ${ul.name} (ID: ${ul.locationId})`)
      })
    }
    console.log('')
    
    // 3. Get recent sessions
    console.log('📅 Fetching Royce\'s recent sessions...')
    const sessions = await prisma.$queryRaw`
      SELECT 
        s.id, 
        s."clientId", 
        s."sessionDate", 
        s.validated, 
        s."locationId",
        c.name as client_name,
        c.email as client_email,
        c.active as client_active,
        c."organizationId" as client_org,
        c."locationId" as client_location,
        c."primaryTrainerId" as client_primary_trainer
      FROM sessions s
      LEFT JOIN clients c ON c.id = s."clientId"
      WHERE s."trainerId" = ${royce.id}
      AND s.cancelled = false
      ORDER BY s."sessionDate" DESC
      LIMIT 30
    ` as any[]
    
    console.log(`   Found ${sessions.length} recent non-cancelled sessions`)
    
    // Get unique clients
    const uniqueClients = new Map()
    sessions.forEach((s: any) => {
      if (!uniqueClients.has(s.clientId)) {
        uniqueClients.set(s.clientId, {
          id: s.clientId,
          name: s.client_name,
          email: s.client_email,
          active: s.client_active,
          organizationId: s.client_org,
          locationId: s.client_location,
          primaryTrainerId: s.client_primary_trainer
        })
      }
    })
    
    console.log(`   Unique clients in these sessions: ${uniqueClients.size}`)
    console.log('')
    
    // 4. Analyze each client
    console.log('🔍 Analyzing each client from sessions...')
    console.log('=' .repeat(60))
    
    const issues = {
      notFound: 0,
      inactive: 0,
      differentOrg: 0,
      differentLocation: 0,
      notPrimaryTrainer: 0,
      noIssues: 0
    }
    
    // Collect all Royce's location IDs
    const royceLocationIds = [royce.locationId, ...userLocations.map((ul: any) => ul.locationId)].filter(Boolean)
    
    uniqueClients.forEach((client, clientId) => {
      console.log(`\n📋 Client: ${client.name || 'UNKNOWN'}`)
      console.log(`   ID: ${clientId}`)
      
      const clientIssues = []
      
      if (!client.name) {
        console.log('   ❌ CLIENT NOT FOUND IN DATABASE')
        issues.notFound++
        return
      }
      
      console.log(`   Email: ${client.email}`)
      console.log(`   Active: ${client.active}`)
      console.log(`   Organization ID: ${client.organizationId}`)
      console.log(`   Location ID: ${client.locationId}`)
      console.log(`   Primary Trainer ID: ${client.primaryTrainerId}`)
      
      // Check issues
      if (!client.active) {
        clientIssues.push('INACTIVE')
        issues.inactive++
      }
      
      if (client.organizationId !== royce.organizationId) {
        clientIssues.push(`DIFFERENT ORG`)
        issues.differentOrg++
      }
      
      if (!royceLocationIds.includes(client.locationId)) {
        clientIssues.push(`DIFFERENT LOCATION`)
        issues.differentLocation++
      }
      
      if (client.primaryTrainerId !== royce.id) {
        clientIssues.push(`NOT PRIMARY TRAINER`)
        issues.notPrimaryTrainer++
      }
      
      if (clientIssues.length === 0) {
        console.log('   ✅ NO ISSUES FOUND')
        issues.noIssues++
      } else {
        console.log('   ⚠️  ISSUES:')
        clientIssues.forEach(issue => console.log(`      - ${issue}`))
      }
    })
    
    // 5. Find clients assigned to Royce
    console.log('\n' + '=' .repeat(60))
    console.log('🔍 Clients assigned to Royce as primary trainer:')
    
    const primaryClients = await prisma.$queryRaw`
      SELECT id, name, email, active, "locationId"
      FROM clients
      WHERE "primaryTrainerId" = ${royce.id}
      AND "organizationId" = ${royce.organizationId}
    ` as any[]
    
    console.log(`Found ${primaryClients.length} clients with Royce as primary trainer`)
    primaryClients.forEach((c: any) => {
      console.log(`  - ${c.name} (${c.email}) - Active: ${c.active}`)
    })
    
    // 6. Summary
    console.log('\n' + '=' .repeat(60))
    console.log('📊 SUMMARY')
    console.log('=' .repeat(60))
    console.log(`Total unique clients from sessions: ${uniqueClients.size}`)
    console.log(`  - Not found in database: ${issues.notFound}`)
    console.log(`  - Inactive: ${issues.inactive}`)
    console.log(`  - Different organization: ${issues.differentOrg}`)
    console.log(`  - Different location: ${issues.differentLocation}`)
    console.log(`  - Not Royce's primary clients: ${issues.notPrimaryTrainer}`)
    console.log(`  - No issues found: ${issues.noIssues}`)
    console.log(`\nClients assigned to Royce: ${primaryClients.length}`)
    
    // 7. Diagnosis
    console.log('\n' + '=' .repeat(60))
    console.log('🔬 DIAGNOSIS')
    console.log('=' .repeat(60))
    
    if (issues.notPrimaryTrainer > issues.noIssues) {
      console.log('⚠️  MAIN ISSUE: Royce has sessions with clients not assigned to him')
      console.log('\nPossible causes:')
      console.log('1. Royce is covering sessions for other trainers')
      console.log('2. Clients were reassigned after sessions were created')
      console.log('3. The UI filters to show only primary clients')
      console.log('\nSOLUTION: Check if the client list has filters applied.')
      console.log('Look for "My Clients Only" vs "All Clients" toggle.')
    }
    
    if (issues.differentLocation > 0) {
      console.log('\n⚠️  LOCATION ISSUE: Some clients are in different locations')
      console.log('SOLUTION: Add Royce to those locations or reassign clients.')
    }
    
    if (issues.inactive > 0) {
      console.log('\n⚠️  INACTIVE CLIENTS: Some clients are marked inactive but have sessions')
      console.log('SOLUTION: Reactivate these clients.')
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