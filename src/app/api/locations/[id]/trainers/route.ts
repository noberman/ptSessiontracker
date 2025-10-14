import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/locations/[id]/trainers - Get all trainers with access to a specific location
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: locationId } = await context.params
  
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify location exists
    const location = await prisma.location.findUnique({
      where: { id: locationId },
      select: { 
        id: true, 
        name: true,
        organizationId: true 
      }
    })

    if (!location) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      )
    }

    // Get all trainers and PT managers with access to this location
    // Admins should NOT be included as they don't typically have clients assigned
    const trainers = await prisma.user.findMany({
      where: {
        active: true,
        organizationId: location.organizationId,
        role: { in: ['TRAINER', 'PT_MANAGER'] },
        locations: {
          some: {
            locationId: locationId
          }
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        // Count of clients at this specific location
        _count: {
          select: {
            assignedClients: {
              where: {
                locationId: locationId,
                active: true
              }
            }
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Format the response with additional context
    const formattedTrainers = trainers.map(trainer => ({
      id: trainer.id,
      name: trainer.name,
      email: trainer.email,
      role: trainer.role,
      clientCount: trainer._count.assignedClients,
      displayName: `${trainer.name} (${trainer._count.assignedClients} clients)`
    }))

    return NextResponse.json({
      location: {
        id: location.id,
        name: location.name
      },
      trainers: formattedTrainers,
      totalCount: formattedTrainers.length
    })

  } catch (error) {
    console.error('Error fetching location trainers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch trainers' },
      { status: 500 }
    )
  }
}