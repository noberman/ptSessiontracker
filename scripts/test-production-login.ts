import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function testProductionLogin() {
  try {
    console.log('🔍 Testing Production Login Issue...\n')
    
    // 1. Check if admin exists
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@ptsession.com' },
      include: { location: true }
    })
    
    if (!admin) {
      console.log('❌ No admin account found!')
      console.log('\n🔧 Creating admin account...')
      
      const hashedPassword = await bcrypt.hash('admin123', 10)
      const newAdmin = await prisma.user.create({
        data: {
          email: 'admin@ptsession.com',
          password: hashedPassword,
          name: 'Admin User',
          role: 'ADMIN',
          active: true
        }
      })
      console.log('✅ Admin account created!')
      return
    }
    
    console.log('✅ Admin account exists:')
    console.log(`  ID: ${admin.id}`)
    console.log(`  Email: ${admin.email}`)
    console.log(`  Name: ${admin.name}`)
    console.log(`  Role: ${admin.role}`)
    console.log(`  Active: ${admin.active}`)
    console.log(`  Location: ${admin.location?.name || 'None'}`)
    console.log(`  Created: ${admin.createdAt}`)
    
    // 2. Test password variations
    console.log('\n🔐 Testing password hashes:')
    
    const passwords = ['admin123', 'Admin123', 'admin', 'password']
    let validPassword: string | null = null
    
    for (const pwd of passwords) {
      const isValid = await bcrypt.compare(pwd, admin.password)
      console.log(`  "${pwd}": ${isValid ? '✅ VALID' : '❌ Invalid'}`)
      if (isValid) validPassword = pwd
    }
    
    // 3. Check password hash format
    console.log('\n🔍 Password hash analysis:')
    console.log(`  Hash starts with: ${admin.password.substring(0, 7)}`)
    console.log(`  Hash length: ${admin.password.length}`)
    console.log(`  Looks like bcrypt: ${admin.password.startsWith('$2') ? '✅ Yes' : '❌ No'}`)
    
    // 4. If no valid password, reset it
    if (!validPassword) {
      console.log('\n⚠️  No valid password found! Resetting to "admin123"...')
      
      const newHash = await bcrypt.hash('admin123', 10)
      await prisma.user.update({
        where: { id: admin.id },
        data: { 
          password: newHash,
          active: true  // Ensure account is active
        }
      })
      
      console.log('✅ Password reset successfully!')
      validPassword = 'admin123'
    }
    
    // 5. Test the password one more time
    const updatedAdmin = await prisma.user.findUnique({
      where: { email: 'admin@ptsession.com' }
    })
    
    if (updatedAdmin) {
      const finalCheck = await bcrypt.compare('admin123', updatedAdmin.password)
      console.log(`\n🔑 Final verification with "admin123": ${finalCheck ? '✅ SUCCESS' : '❌ FAILED'}`)
    }
    
    console.log('\n📋 PRODUCTION LOGIN CREDENTIALS:')
    console.log('================================')
    console.log(`Email: admin@ptsession.com`)
    console.log(`Password: ${validPassword || 'admin123'}`)
    console.log('================================')
    
    // 6. Check for any other admin accounts
    const allAdmins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { email: true, name: true, active: true }
    })
    
    if (allAdmins.length > 1) {
      console.log('\n📋 Other admin accounts:')
      allAdmins.forEach(a => {
        if (a.email !== 'admin@ptsession.com') {
          console.log(`  - ${a.email} (${a.name}) - Active: ${a.active}`)
        }
      })
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testProductionLogin()