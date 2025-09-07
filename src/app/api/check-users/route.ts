import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
    // Get all users (without passwords)
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        locationId: true,
        location: {
          select: {
            name: true
          }
        },
        createdAt: true
      }
    })

    // Get all locations
    const locations = await prisma.location.findMany({
      select: {
        id: true,
        name: true,
        active: true
      }
    })

    return NextResponse.json({
      userCount: users.length,
      users: users,
      locations: locations,
      adminExists: users.some(u => u.role === 'ADMIN'),
      adminEmails: users.filter(u => u.role === 'ADMIN').map(u => u.email)
    })
  } catch (error: any) {
    console.error('Check users error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to check users',
        details: error.message
      },
      { status: 500 }
    )
  }
}