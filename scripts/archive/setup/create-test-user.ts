#!/usr/bin/env ts-node

import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const prisma = new PrismaClient()

async function createTestUser() {
  try {
    // Find Test Gym organization
    const testGym = await prisma.organization.findFirst({
      where: { name: 'Test Gym' }
    })

    if (!testGym) {
      console.error('Test Gym organization not found!')
      return
    }

    // Find a location for Test Gym (or use first available)
    const location = await prisma.location.findFirst({
      where: { 
        OR: [
          { organizationId: testGym.id },
          { organizationId: null }
        ]
      }
    })

    // Create test admin user for Test Gym
    const hashedPassword = await bcrypt.hash('password123', 10)
    
    const testUser = await prisma.user.create({
      data: {
        email: 'testadmin@testgym.com',
        password: hashedPassword,
        name: 'Test Admin',
        role: 'ADMIN',
        organizationId: testGym.id,
        locationId: location?.id,
        active: true,
      }
    })

    console.log('✅ Test user created successfully!')
    console.log('\n📧 Login Credentials:')
    console.log('='.repeat(40))
    console.log('Email: testadmin@testgym.com')
    console.log('Password: password123')
    console.log('Organization: Test Gym (FREE tier)')
    console.log('Role: ADMIN')
    console.log('='.repeat(40))
    console.log('\nYou can now log in with these credentials to test the upgrade flow!')

  } catch (error: any) {
    if (error.code === 'P2002') {
      console.log('ℹ️ User already exists!')
      console.log('\n📧 Login with:')
      console.log('Email: testadmin@testgym.com')
      console.log('Password: password123')
    } else {
      console.error('Error creating test user:', error)
    }
  } finally {
    await prisma.$disconnect()
  }
}

createTestUser()