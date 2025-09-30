import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function createProductionAdmin() {
  try {
    console.log('🔧 Creating production admin account...\n')
    
    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@ptsession.com' }
    })
    
    if (existingAdmin) {
      console.log('⚠️  Admin account already exists!')
      console.log('Updating password just in case...')
      
      const hashedPassword = await bcrypt.hash('admin123', 10)
      await prisma.user.update({
        where: { email: 'admin@ptsession.com' },
        data: { 
          password: hashedPassword,
          active: true
        }
      })
      console.log('✅ Password updated!')
      return
    }
    
    // Create admin user
    console.log('Creating admin user...')
    const hashedPassword = await bcrypt.hash('admin123', 10)
    
    const admin = await prisma.user.create({
      data: {
        email: 'admin@ptsession.com',
        password: hashedPassword,
        name: 'Admin User',
        role: 'ADMIN',
        active: true
      }
    })
    
    console.log('✅ Admin user created successfully!')
    console.log('\n📋 Login Credentials:')
    console.log('====================')
    console.log('Email: admin@ptsession.com')
    console.log('Password: admin123')
    console.log('====================\n')
    
    // Verify the password works
    const isValid = await bcrypt.compare('admin123', admin.password)
    console.log('🔐 Password verification:', isValid ? '✅ PASSED' : '❌ FAILED')
    
    // Check total users
    const userCount = await prisma.user.count()
    console.log(`\n📊 Total users in database: ${userCount}`)
    
  } catch (error) {
    console.error('❌ Error creating admin:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createProductionAdmin()