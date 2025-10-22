#!/usr/bin/env ts-node

import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const prisma = new PrismaClient()

async function fixTestGymSubscription() {
  try {
    console.log('🔍 Finding Test Gym organization...')
    
    const testGym = await prisma.organization.findFirst({
      where: { name: 'Test Gym' }
    })

    if (!testGym) {
      console.error('Test Gym not found!')
      return
    }

    console.log(`Current status: ${testGym.subscriptionTier}`)
    
    if (testGym.subscriptionTier === 'SCALE') {
      console.log('✅ Already on SCALE! Webhooks are working!')
      return
    }

    // Check if we should update to SCALE
    console.log('\nTest Gym has a Stripe subscription but shows as FREE.')
    console.log('This happens when the webhook wasn\'t set up yet.')
    
    // Update to SCALE
    const updated = await prisma.organization.update({
      where: { id: testGym.id },
      data: {
        subscriptionTier: 'SCALE',
        subscriptionStatus: 'ACTIVE',
        // Note: We don't have the subscription ID from Stripe here
        // You could get it from Stripe API if needed
      }
    })

    console.log('\n✅ Updated Test Gym to PRO tier!')
    console.log('Refresh your billing page to see the change.')
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Reset option
async function resetTestGymToFree() {
  try {
    const testGym = await prisma.organization.findFirst({
      where: { name: 'Test Gym' }
    })

    if (!testGym) {
      console.error('Test Gym not found!')
      return
    }

    await prisma.organization.update({
      where: { id: testGym.id },
      data: {
        subscriptionTier: 'FREE',
        subscriptionStatus: 'ACTIVE',
        stripeSubscriptionId: null,
      }
    })

    console.log('✅ Reset Test Gym to FREE tier')
    console.log('You can now test the upgrade flow again!')
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Check command line args
const command = process.argv[2]

if (command === 'reset') {
  console.log('Resetting Test Gym to FREE tier...')
  resetTestGymToFree()
} else {
  console.log('Fixing Test Gym subscription status...')
  fixTestGymSubscription()
}