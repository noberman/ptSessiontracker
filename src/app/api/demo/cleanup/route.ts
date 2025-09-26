import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || !session.user.organizationId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const orgId = session.user.organizationId

    // Delete all demo data for this organization
    const deleted = await prisma.$transaction(async (tx) => {
      // Delete demo sessions first (due to foreign key constraints)
      const sessions = await tx.session.deleteMany({
        where: {
          organizationId: orgId,
          isDemo: true
        }
      })

      // Delete demo packages
      const packages = await tx.package.deleteMany({
        where: {
          organizationId: orgId,
          isDemo: true
        }
      })

      // Delete demo clients
      const clients = await tx.client.deleteMany({
        where: {
          organizationId: orgId,
          isDemo: true
        }
      })

      return {
        sessions: sessions.count,
        packages: packages.count,
        clients: clients.count
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Demo data cleaned up successfully',
      deleted
    })

  } catch (error: any) {
    console.error('Demo cleanup error:', error)
    return NextResponse.json(
      { error: 'Failed to clean up demo data' },
      { status: 500 }
    )
  }
}

// GET method to check if there's demo data
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || !session.user.organizationId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const orgId = session.user.organizationId

    // Count demo data
    const [sessions, packages, clients] = await Promise.all([
      prisma.session.count({
        where: {
          organizationId: orgId,
          isDemo: true
        }
      }),
      prisma.package.count({
        where: {
          organizationId: orgId,
          isDemo: true
        }
      }),
      prisma.client.count({
        where: {
          organizationId: orgId,
          isDemo: true
        }
      })
    ])

    const hasDemo = sessions > 0 || packages > 0 || clients > 0

    return NextResponse.json({
      hasDemo,
      count: {
        sessions,
        packages,
        clients,
        total: sessions + packages + clients
      }
    })

  } catch (error: any) {
    console.error('Demo check error:', error)
    return NextResponse.json(
      { error: 'Failed to check demo data' },
      { status: 500 }
    )
  }
}