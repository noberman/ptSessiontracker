import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// TEMPORARY: Remove this file after seeding staging
export async function GET(request: NextRequest) {
  // Only allow in staging environment
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Not allowed in production' },
      { status: 403 }
    )
  }

  try {
    // Check if already seeded
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@ptsession.com' }
    })

    if (existingAdmin) {
      return NextResponse.json({ 
        message: 'Database already seeded',
        accounts: [
          'admin@ptsession.com / admin123',
          'manager@woodsquare.com / manager123',
          'john@woodsquare.com / trainer123'
        ]
      })
    }

    // Create locations
    const woodSquare = await prisma.location.create({
      data: { name: 'Wood Square Fitness' }
    })

    // Create users
    const hashedPassword = await bcrypt.hash('admin123', 10)
    await prisma.user.create({
      data: {
        email: 'admin@ptsession.com',
        password: hashedPassword,
        name: 'Admin User',
        role: 'ADMIN',
        locationId: woodSquare.id
      }
    })

    const managerPassword = await bcrypt.hash('manager123', 10)
    await prisma.user.create({
      data: {
        email: 'manager@woodsquare.com',
        password: managerPassword,
        name: 'Club Manager',
        role: 'CLUB_MANAGER',
        locationId: woodSquare.id
      }
    })

    const trainerPassword = await bcrypt.hash('trainer123', 10)
    await prisma.user.create({
      data: {
        email: 'john@woodsquare.com',
        password: trainerPassword,
        name: 'John Smith',
        role: 'TRAINER',
        locationId: woodSquare.id
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Staging database seeded successfully',
      accounts: [
        'admin@ptsession.com / admin123',
        'manager@woodsquare.com / manager123',
        'john@woodsquare.com / trainer123'
      ]
    })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json(
      { error: 'Failed to seed database' },
      { status: 500 }
    )
  }
}