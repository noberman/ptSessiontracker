import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getActivePackageWhereClause } from '@/lib/package-status'

// GET /api/users/[id]/clients - Get all clients assigned to a user
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: userId } = await context.params

  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only managers and admins can view client assignments
    if (!['CLUB_MANAGER', 'PT_MANAGER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get all non-archived clients assigned to this user with package data
    const clients = await prisma.client.findMany({
      where: {
        primaryTrainerId: userId,
        active: true,
        organizationId: session.user.organizationId
      },
      select: {
        id: true,
        name: true,
        email: true,
        locationId: true,
        location: {
          select: {
            id: true,
            name: true
          }
        },
        packages: {
          where: getActivePackageWhereClause(),
          select: { id: true }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Categorize clients: those with active packages vs those without
    const activePackageClients = []
    const inactiveClients = []

    for (const client of clients) {
      const formatted = {
        id: client.id,
        name: client.name,
        email: client.email,
        locationId: client.locationId,
        locationName: client.location.name
      }

      if (client.packages.length > 0) {
        activePackageClients.push(formatted)
      } else {
        inactiveClients.push(formatted)
      }
    }

    return NextResponse.json({
      activePackageClients,
      inactiveClients,
      activePackageClientCount: activePackageClients.length,
      inactiveClientCount: inactiveClients.length,
      // Backward compatibility
      clients: [...activePackageClients, ...inactiveClients],
      totalCount: clients.length
    })

  } catch (error) {
    console.error('Error fetching user clients:', error)
    return NextResponse.json(
      { error: 'Failed to fetch clients' },
      { status: 500 }
    )
  }
}
