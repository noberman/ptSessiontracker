import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function checkAdminLogin() {
  try {
    console.log('🔍 Checking admin account...\n')
    
    const admin = await prisma.user.findFirst({
      where: { email: 'admin@ptsession.com' }
    })
    
    if (!admin) {
      console.log('❌ Admin account not found!')
      return
    }
    
    console.log('✅ Admin account found:')
    console.log(`  Email: ${admin.email}`)
    console.log(`  Name: ${admin.name}`)
    console.log(`  Role: ${admin.role}`)
    console.log(`  Active: ${admin.active}`)
    console.log(`  Created: ${admin.createdAt.toLocaleDateString()}`)
    
    // Test password
    const testPassword = 'admin123'
    const isValid = await bcrypt.compare(testPassword, admin.password)
    console.log(`\n📝 Testing password 'admin123': ${isValid ? '✅ VALID' : '❌ INVALID'}`)
    
    if (!isValid) {
      console.log('\n🔧 Resetting admin password to "admin123"...')
      const hashedPassword = await bcrypt.hash('admin123', 10)
      await prisma.user.update({
        where: { email: 'admin@ptsession.com' },
        data: { password: hashedPassword }
      })
      console.log('✅ Password reset successfully!')
      console.log('\n🔑 You can now login with:')
      console.log('  Email: admin@ptsession.com')
      console.log('  Password: admin123')
    } else {
      console.log('\n🔑 Login credentials:')
      console.log('  Email: admin@ptsession.com')
      console.log('  Password: admin123')
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkAdminLogin()