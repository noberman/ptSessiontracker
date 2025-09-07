import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// TEMPORARY: Remove this file after seeding staging
export async function GET(request: NextRequest) {
  // Only allow in staging environment (check for staging-specific URL)
  const isStaging = process.env.NEXTAUTH_URL?.includes('staging') || 
                     process.env.APP_URL?.includes('staging') ||
                     process.env.RAILWAY_ENVIRONMENT === 'staging'
  
  if (!isStaging) {
    return NextResponse.json(
      { error: 'Only allowed in staging environment' },
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

    // Seed package templates
    const templates = [
      // Prime Packages
      {
        name: 'Pre-Paid - 12 Prime PT Sessions',
        displayName: '12 Prime PT Sessions',
        category: 'Prime',
        sessions: 12,
        price: 1200.00,
        sessionValue: 100.00,
        sortOrder: 1
      },
      {
        name: 'Pre-Paid - 24 Prime PT Sessions',
        displayName: '24 Prime PT Sessions',
        category: 'Prime',
        sessions: 24,
        price: 2160.00,
        sessionValue: 90.00,
        sortOrder: 2
      },
      {
        name: 'Pre-Paid - 36 Prime PT Sessions',
        displayName: '36 Prime PT Sessions',
        category: 'Prime',
        sessions: 36,
        price: 2880.00,
        sessionValue: 80.00,
        sortOrder: 3
      },
      // Intro Package
      {
        name: '3 PT Session - Intro Pack',
        displayName: '3 Session Intro Pack',
        category: 'Intro',
        sessions: 3,
        price: 138.00,
        sessionValue: 46.00,
        sortOrder: 1
      },
      // Transformation Packages
      {
        name: 'Transformation Challenge Credits - 12',
        displayName: 'Transformation Challenge - 12 Credits',
        category: 'Transformation',
        sessions: 12,
        price: 999.00,
        sessionValue: 83.25,
        sortOrder: 1
      },
      {
        name: 'Transformation Challenge Credits - 24',
        displayName: 'Transformation Challenge - 24 Credits',
        category: 'Transformation',
        sessions: 24,
        price: 1799.00,
        sessionValue: 74.96,
        sortOrder: 2
      },
      // Elite Packages
      {
        name: 'Pre-Paid - 12 Elite PT Sessions',
        displayName: '12 Elite PT Sessions',
        category: 'Elite',
        sessions: 12,
        price: 1440.00,
        sessionValue: 120.00,
        sortOrder: 1
      },
      {
        name: 'Pre-Paid - 24 Elite PT Sessions',
        displayName: '24 Elite PT Sessions',
        category: 'Elite',
        sessions: 24,
        price: 2592.00,
        sessionValue: 108.00,
        sortOrder: 2
      },
      {
        name: 'Pre-Paid - 36 Elite PT Sessions',
        displayName: '36 Elite PT Sessions',
        category: 'Elite',
        sessions: 36,
        price: 3456.00,
        sessionValue: 96.00,
        sortOrder: 3
      }
    ]

    // Create package templates
    for (const template of templates) {
      await prisma.packageTemplate.create({
        data: template
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Staging database seeded successfully',
      accounts: [
        'admin@ptsession.com / admin123',
        'manager@woodsquare.com / manager123',
        'john@woodsquare.com / trainer123'
      ],
      packageTemplates: `Created ${templates.length} package templates`
    })
  } catch (error: any) {
    console.error('Seed error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to seed database',
        details: error.message || 'Unknown error',
        code: error.code
      },
      { status: 500 }
    )
  }
}