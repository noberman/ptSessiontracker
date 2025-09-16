import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import bcrypt from 'bcryptjs'

export async function GET() {
  try {
    console.log('🔧 INIT: Creating admin account...')
    
    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@ptsession.com' }
    })
    
    if (existingAdmin) {
      console.log('⚠️  INIT: Admin already exists, updating password...')
      const hashedPassword = await bcrypt.hash('admin123', 10)
      
      await prisma.user.update({
        where: { email: 'admin@ptsession.com' },
        data: { 
          password: hashedPassword,
          active: true
        }
      })
      
      return NextResponse.json({
        success: true,
        message: 'Admin account already exists - password updated',
        email: 'admin@ptsession.com'
      })
    }
    
    console.log('✅ INIT: Creating new admin user...')
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
    
    // Verify the password works
    const isValid = await bcrypt.compare('admin123', admin.password)
    
    // Get user count
    const userCount = await prisma.user.count()
    
    return NextResponse.json({
      success: true,
      message: 'Admin account created successfully',
      email: 'admin@ptsession.com',
      password: 'admin123',
      passwordVerified: isValid,
      totalUsers: userCount
    })
    
  } catch (error) {
    console.error('❌ INIT: Error:', error)
    return NextResponse.json({
      success: false,
      error: String(error)
    }, { status: 500 })
  }
}