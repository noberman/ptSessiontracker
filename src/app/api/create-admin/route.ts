import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET(request: NextRequest) {
  // Only allow in production environment
  const isProduction = process.env.NODE_ENV === 'production' && 
                       !process.env.NEXTAUTH_URL?.includes('staging')
  
  if (!isProduction) {
    return NextResponse.json(
      { error: 'Only allowed in production environment' },
      { status: 403 }
    )
  }

  try {
    // Check if admin exists
    const existingAdmin = await prisma.user.findFirst({
      where: { email: 'admin@fitsync.com' }
    })

    if (existingAdmin) {
      // Reset password to default
      const hashedPassword = await bcrypt.hash('Admin123!', 10)
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: { password: hashedPassword }
      })
      
      return NextResponse.json({
        message: 'Admin already exists - password reset to: Admin123!',
        email: 'admin@fitsync.com',
        note: 'Please change this password immediately after login'
      })
    }

    // Check if any location exists, create one if not
    let location = await prisma.location.findFirst()
    if (!location) {
      location = await prisma.location.create({
        data: { 
          name: 'FitSync Main',
          active: true 
        }
      })
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('Admin123!', 10)
    const admin = await prisma.user.create({
      data: {
        email: 'admin@fitsync.com',
        password: hashedPassword,
        name: 'Admin',
        role: 'ADMIN',
        active: true
      }
    })

    // Associate admin with location through UserLocation junction table
    await prisma.userLocation.create({
      data: {
        userId: admin.id,
        locationId: location.id
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Admin account created successfully',
      email: 'admin@fitsync.com',
      password: 'Admin123!',
      note: 'Please change this password immediately after login',
      adminId: admin.id
    })
  } catch (error: any) {
    console.error('Create admin error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create admin account',
        details: error.message
      },
      { status: 500 }
    )
  }
}