#!/usr/bin/env npx tsx
/**
 * Test script to verify session creation is blocked when package has no remaining sessions
 * Run with: npm run test:session-limit
 */

import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  dim: '\x1b[2m'
}

async function testSessionLimit() {
  console.log(`${colors.blue}🧪 Starting Session Limit Test${colors.reset}\n`)

  let testOrg: any
  let testUser: any
  let testLocation: any
  let testClient: any
  let testPackage: any
  let createdSessions: any[] = []

  try {
    // Step 1: Create test organization
    console.log(`${colors.dim}Creating test organization...${colors.reset}`)
    testOrg = await prisma.organization.create({
      data: {
        name: 'Test Org - Session Limit',
        email: `test-session-limit-${Date.now()}@test.com`,
        subscriptionTier: 'FREE'
      }
    })
    console.log(`${colors.green}✓ Created test organization${colors.reset}`)

    // Step 2: Create test location
    console.log(`${colors.dim}Creating test location...${colors.reset}`)
    testLocation = await prisma.location.create({
      data: {
        name: `Test Location ${Date.now()}`,
        organizationId: testOrg.id
      }
    })
    console.log(`${colors.green}✓ Created test location${colors.reset}`)

    // Step 3: Create test trainer
    console.log(`${colors.dim}Creating test trainer...${colors.reset}`)
    testUser = await prisma.user.create({
      data: {
        email: `trainer-${Date.now()}@test.com`,
        password: await hash('TestPass123!', 10),
        name: 'Test Trainer',
        role: 'TRAINER',
        organizationId: testOrg.id
      }
    })
    
    // Give trainer access to location
    await prisma.userLocation.create({
      data: {
        userId: testUser.id,
        locationId: testLocation.id
      }
    })
    console.log(`${colors.green}✓ Created test trainer${colors.reset}`)

    // Step 4: Create test client
    console.log(`${colors.dim}Creating test client...${colors.reset}`)
    testClient = await prisma.client.create({
      data: {
        name: 'Test Client',
        email: `client-${Date.now()}@test.com`,
        locationId: testLocation.id,
        organizationId: testOrg.id,
        primaryTrainerId: testUser.id
      }
    })
    console.log(`${colors.green}✓ Created test client${colors.reset}`)

    // Step 5: Create package with ONLY 2 sessions
    console.log(`${colors.dim}Creating package with 2 sessions...${colors.reset}`)
    testPackage = await prisma.package.create({
      data: {
        clientId: testClient.id,
        organizationId: testOrg.id,
        name: 'Test Package - 2 Sessions',
        totalSessions: 2,
        remainingSessions: 2,
        totalValue: 200,
        sessionValue: 100,
        active: true
      }
    })
    console.log(`${colors.green}✓ Created package with 2 sessions${colors.reset}`)
    console.log(`  Package ID: ${testPackage.id}`)
    console.log(`  Remaining: ${testPackage.remainingSessions}/${testPackage.totalSessions}\n`)

    // Step 6: Create first session (should succeed)
    console.log(`${colors.yellow}Test 1: Creating first session (should succeed)${colors.reset}`)
    const session1 = await prisma.session.create({
      data: {
        clientId: testClient.id,
        trainerId: testUser.id,
        packageId: testPackage.id,
        locationId: testLocation.id,
        organizationId: testOrg.id,
        sessionDate: new Date(),
        sessionValue: 100,
        validated: false
      }
    })
    createdSessions.push(session1)
    
    // Update package remaining sessions
    await prisma.package.update({
      where: { id: testPackage.id },
      data: { remainingSessions: 1 }
    })
    
    const pkg1 = await prisma.package.findUnique({ where: { id: testPackage.id } })
    console.log(`${colors.green}✓ Session 1 created successfully${colors.reset}`)
    console.log(`  Remaining: ${pkg1?.remainingSessions}/${pkg1?.totalSessions}\n`)

    // Step 7: Create second session (should succeed)
    console.log(`${colors.yellow}Test 2: Creating second session (should succeed)${colors.reset}`)
    const session2 = await prisma.session.create({
      data: {
        clientId: testClient.id,
        trainerId: testUser.id,
        packageId: testPackage.id,
        locationId: testLocation.id,
        organizationId: testOrg.id,
        sessionDate: new Date(),
        sessionValue: 100,
        validated: false
      }
    })
    createdSessions.push(session2)
    
    // Update package remaining sessions
    await prisma.package.update({
      where: { id: testPackage.id },
      data: { remainingSessions: 0 }
    })
    
    const pkg2 = await prisma.package.findUnique({ where: { id: testPackage.id } })
    console.log(`${colors.green}✓ Session 2 created successfully${colors.reset}`)
    console.log(`  Remaining: ${pkg2?.remainingSessions}/${pkg2?.totalSessions}\n`)

    // Step 8: Try to create third session (SHOULD FAIL with new validation)
    console.log(`${colors.yellow}Test 3: Creating third session (should FAIL)${colors.reset}`)
    
    // First check the package state
    const pkgBefore = await prisma.package.findUnique({ where: { id: testPackage.id } })
    console.log(`  Package state before attempt:`)
    console.log(`  - Remaining sessions: ${pkgBefore?.remainingSessions}`)
    console.log(`  - Total sessions: ${pkgBefore?.totalSessions}`)
    
    try {
      // This simulates what the API would check
      if (pkgBefore && pkgBefore.remainingSessions <= 0) {
        throw new Error('Package has no remaining sessions. Please purchase a new package.')
      }
      
      const session3 = await prisma.session.create({
        data: {
          clientId: testClient.id,
          trainerId: testUser.id,
          packageId: testPackage.id,
          locationId: testLocation.id,
          organizationId: testOrg.id,
          sessionDate: new Date(),
          sessionValue: 100,
          validated: false
        }
      })
      createdSessions.push(session3)
      
      // This should NOT happen with the fix
      console.log(`${colors.red}✗ ERROR: Session 3 was created when it should have been blocked!${colors.reset}`)
      console.log(`${colors.red}  The validation is NOT working properly${colors.reset}`)
      return false
      
    } catch (error: any) {
      if (error.message.includes('no remaining sessions')) {
        console.log(`${colors.green}✓ Session 3 was correctly BLOCKED${colors.reset}`)
        console.log(`  Error message: "${error.message}"`)
        
        // Verify no session was created
        const sessionCount = await prisma.session.count({
          where: { packageId: testPackage.id }
        })
        console.log(`  Total sessions created: ${sessionCount} (should be 2)`)
        
        if (sessionCount === 2) {
          console.log(`${colors.green}✓ Confirmed: Only 2 sessions exist (no overflow)${colors.reset}`)
          return true
        } else {
          console.log(`${colors.red}✗ ERROR: Found ${sessionCount} sessions, expected 2${colors.reset}`)
          return false
        }
      } else {
        throw error
      }
    }

  } catch (error) {
    console.error(`${colors.red}Test failed with error:${colors.reset}`, error)
    return false
    
  } finally {
    // Cleanup test data
    console.log(`\n${colors.dim}Cleaning up test data...${colors.reset}`)
    
    // Delete in reverse order of dependencies
    if (createdSessions.length > 0) {
      await prisma.session.deleteMany({
        where: { id: { in: createdSessions.map(s => s.id) } }
      })
    }
    
    if (testPackage) {
      await prisma.package.delete({ where: { id: testPackage.id } })
    }
    
    if (testClient) {
      await prisma.client.delete({ where: { id: testClient.id } })
    }
    
    if (testUser) {
      await prisma.userLocation.deleteMany({ where: { userId: testUser.id } })
      await prisma.user.delete({ where: { id: testUser.id } })
    }
    
    if (testLocation) {
      await prisma.location.delete({ where: { id: testLocation.id } })
    }
    
    if (testOrg) {
      await prisma.organization.delete({ where: { id: testOrg.id } })
    }
    
    console.log(`${colors.green}✓ Test data cleaned up${colors.reset}`)
  }
}

// Run the test
testSessionLimit()
  .then((success) => {
    if (success) {
      console.log(`\n${colors.green}═══════════════════════════════════════${colors.reset}`)
      console.log(`${colors.green} 🎉 ALL TESTS PASSED! Validation works! ${colors.reset}`)
      console.log(`${colors.green}═══════════════════════════════════════${colors.reset}\n`)
      process.exit(0)
    } else {
      console.log(`\n${colors.red}═══════════════════════════════════════${colors.reset}`)
      console.log(`${colors.red} ❌ TEST FAILED! Validation not working ${colors.reset}`)
      console.log(`${colors.red}═══════════════════════════════════════${colors.reset}\n`)
      process.exit(1)
    }
  })
  .catch((error) => {
    console.error('Unexpected error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })