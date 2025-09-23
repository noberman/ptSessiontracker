#!/usr/bin/env ts-node

/**
 * Script to create Stripe customers for existing organizations
 * Run with: npx tsx scripts/create-stripe-customer-for-existing.ts
 */

import { PrismaClient } from '@prisma/client'
import Stripe from 'stripe'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY not found in environment variables')
  process.exit(1)
}

const prisma = new PrismaClient()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia',
  typescript: true,
})

async function createStripeCustomersForExisting() {
  try {
    console.log('🔍 Finding organizations without Stripe customers...')
    
    // Find organizations without Stripe customer IDs
    const organizations = await prisma.organization.findMany({
      where: { 
        stripeCustomerId: null 
      },
    })
    
    if (organizations.length === 0) {
      console.log('✅ All organizations already have Stripe customers!')
      return
    }
    
    console.log(`Found ${organizations.length} organization(s) without Stripe customers`)
    
    for (const org of organizations) {
      try {
        console.log(`\n📋 Processing: ${org.name}`)
        
        // Check if customer already exists in Stripe by email
        const existingCustomers = await stripe.customers.list({
          email: org.email,
          limit: 1,
        })
        
        let customerId: string
        
        if (existingCustomers.data.length > 0) {
          // Customer already exists in Stripe
          customerId = existingCustomers.data[0].id
          console.log(`  ↩️  Found existing Stripe customer: ${customerId}`)
        } else {
          // Create new customer
          const customer = await stripe.customers.create({
            email: org.email,
            name: org.name,
            metadata: {
              organizationId: org.id,
              environment: process.env.NODE_ENV || 'development',
              createdFrom: 'migration-script',
              createdAt: new Date().toISOString(),
            },
          })
          
          customerId = customer.id
          console.log(`  ✅ Created new Stripe customer: ${customerId}`)
        }
        
        // Update organization with Stripe customer ID
        await prisma.organization.update({
          where: { id: org.id },
          data: { stripeCustomerId: customerId },
        })
        
        console.log(`  ✅ Updated organization with customer ID`)
        
        // Show subscription status
        const subscriptions = await stripe.subscriptions.list({
          customer: customerId,
          limit: 1,
        })
        
        if (subscriptions.data.length > 0) {
          console.log(`  📊 Has active subscription: ${subscriptions.data[0].id}`)
        } else {
          console.log(`  📊 No active subscription (FREE tier)`)
        }
        
      } catch (error) {
        console.error(`  ❌ Error processing ${org.name}:`, error)
      }
    }
    
    console.log('\n✨ Migration complete!')
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the migration
createStripeCustomersForExisting()
  .then(() => {
    console.log('Script finished')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Script error:', error)
    process.exit(1)
  })