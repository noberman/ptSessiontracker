#!/usr/bin/env ts-node

import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const prisma = new PrismaClient()

async function listUsers() {
  try {
    const users = await prisma.user.findMany({
      include: {
        organization: true,
        location: true,
      },
      orderBy: [
        { role: 'asc' },
        { email: 'asc' }
      ]
    })

    console.log('\n📋 Users in Database:\n')
    console.log('='.repeat(80))
    
    for (const user of users) {
      console.log(`
Email: ${user.email}
Password: (hashed)
Name: ${user.name}
Role: ${user.role}
Organization: ${user.organization?.name || 'None'}
Subscription: ${user.organization?.subscriptionTier || 'N/A'}
Location: ${user.location?.name || 'None'}
${'-'.repeat(40)}`)
    }

    // Also show organizations
    console.log('\n📊 Organizations:\n')
    console.log('='.repeat(80))
    
    const orgs = await prisma.organization.findMany()
    for (const org of orgs) {
      console.log(`
Organization: ${org.name}
Email: ${org.email}
Subscription: ${org.subscriptionTier}
Status: ${org.subscriptionStatus}
Stripe Customer: ${org.stripeCustomerId || 'None'}
${'-'.repeat(40)}`)
    }

    console.log('\n💡 Test Accounts:')
    console.log('='.repeat(80))
    console.log(`
For testing the upgrade flow, you can:

1. Use an existing FREE tier account:
   - Look for any user above with Subscription: FREE
   
2. Create a new test user:
   - Sign up a new organization (if signup is available)
   - Or I can create one for you

3. Change an existing organization to FREE:
   - Pick an organization and I can change it to FREE tier

Common test passwords (if using seed data):
- password123
- testpass123
`)

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

listUsers()