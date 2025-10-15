/**
 * Seed script to create super admin user
 * Run with: npx tsx prisma/seed-super-admin.ts
 */

import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function createSuperAdmin() {
  const email = 'admin@fitventures.sg'
  const password = process.env.SUPER_ADMIN_PASSWORD || 'SuperSecurePassword123!' // Change this!
  
  try {
    // Check if super admin already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { email }
    })

    if (existingAdmin) {
      if (existingAdmin.role !== 'SUPER_ADMIN') {
        // Update existing user to super admin
        const updated = await prisma.user.update({
          where: { id: existingAdmin.id },
          data: {
            role: 'SUPER_ADMIN',
            active: true
          }
        })
        console.log('✅ Updated existing user to super admin:', updated.email)
      } else {
        console.log('ℹ️ Super admin already exists:', email)
      }
    } else {
      // Create new super admin
      const hashedPassword = await hash(password, 10)
      
      const superAdmin = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name: 'Platform Admin',
          role: 'SUPER_ADMIN',
          active: true,
          // Super admin doesn't belong to any specific organization
          organizationId: null,
          onboardingCompletedAt: new Date() // Mark as onboarded
        }
      })

      console.log('✅ Created super admin user:')
      console.log('   Email:', superAdmin.email)
      console.log('   Password:', password)
      console.log('   Role:', superAdmin.role)
      console.log('')
      console.log('⚠️  IMPORTANT: Change the password immediately after first login!')
    }

    // Log the action
    const admin = await prisma.user.findFirst({
      where: { email }
    })

    if (admin) {
      await prisma.adminAuditLog.create({
        data: {
          adminId: admin.id,
          action: 'SUPER_ADMIN_CREATED',
          metadata: {
            createdBy: 'seed-script',
            timestamp: new Date()
          }
        }
      })
    }

  } catch (error) {
    console.error('❌ Error creating super admin:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the seed
createSuperAdmin()
  .then(() => {
    console.log('✅ Super admin seed completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Super admin seed failed:', error)
    process.exit(1)
  })