import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/users/[id]/clients - Get all clients assigned to a user
export async function GET(
  request: NextRequest,
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

    // Get all active clients assigned to this user
    const clients = await prisma.client.findMany({
      where: {
        primaryTrainerId: userId,
        active: true
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
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Format clients with location info for the dialog
    const formattedClients = clients.map(client => ({
      id: client.id,
      name: client.name,
      email: client.email,
      locationId: client.locationId,
      locationName: client.location.name
    }))

    return NextResponse.json({
      clients: formattedClients,
      totalCount: formattedClients.length
    })

  } catch (error) {
    console.error('Error fetching user clients:', error)
    return NextResponse.json(
      { error: 'Failed to fetch clients' },
      { status: 500 }
    )
  }
}