import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const location = await prisma.location.findUnique({
      where: { id },
      include: {
        users: {
          where: {
            role: 'TRAINER',
            active: true
          },
          select: {
            id: true,
            name: true,
            email: true,
            _count: {
              select: {
                sessions: {
                  where: {
                    sessionDate: {
                      gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                    }
                  }
                }
              }
            }
          },
          orderBy: {
            name: 'asc'
          }
        },
        clients: {
          where: {
            active: true
          },
          select: {
            id: true,
            name: true,
            email: true,
            primaryTrainer: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: {
            name: 'asc'
          }
        },
        _count: {
          select: {
            sessions: {
              where: {
                sessionDate: {
                  gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                }
              }
            }
          }
        }
      }
    })

    if (!location) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      )
    }

    // Check permissions
    if (session.user.role === 'TRAINER' || session.user.role === 'CLUB_MANAGER') {
      if (session.user.locationId !== id) {
        return NextResponse.json(
          { error: 'You can only view your assigned location' },
          { status: 403 }
        )
      }
    }

    return NextResponse.json({
      ...location,
      sessionsThisMonth: location._count.sessions
    })
  } catch (error) {
    console.error('Error fetching location:', error)
    return NextResponse.json(
      { error: 'Failed to fetch location' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only admins and PT managers can update locations
  if (session.user.role !== 'ADMIN' && session.user.role !== 'PT_MANAGER') {
    return NextResponse.json(
      { error: 'Only administrators can update locations' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    const { name, active } = body

    // Check if location exists
    const existing = await prisma.location.findUnique({
      where: { id }
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      )
    }

    // Check if new name conflicts with another location
    if (name && name !== existing.name) {
      const nameConflict = await prisma.location.findUnique({
        where: { name: name.trim() }
      })
      
      if (nameConflict) {
        return NextResponse.json(
          { error: 'A location with this name already exists' },
          { status: 400 }
        )
      }
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name.trim()
    if (active !== undefined) updateData.active = active

    const location = await prisma.location.update({
      where: { id },
      data: updateData
    })

    // TODO: Add audit log

    return NextResponse.json(location)
  } catch (error) {
    console.error('Error updating location:', error)
    return NextResponse.json(
      { error: 'Failed to update location' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only admins can archive locations
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Only administrators can archive locations' },
      { status: 403 }
    )
  }

  try {
    // Parse request body for archive reason
    const body = await request.json().catch(() => ({}))
    const { reason } = body

    // First, check archive impact
    const impactResponse = await fetch(
      `${request.url.replace(/\/[^\/]*$/, '')}/archive-impact`,
      {
        headers: request.headers
      }
    )
    const impactData = await impactResponse.json()

    // If location cannot be archived, return the blockers
    if (!impactData.canArchive) {
      return NextResponse.json(
        {
          error: 'Cannot archive location with active dependencies',
          blockers: impactData.blockers,
          summary: impactData.summary
        },
        { status: 400 }
      )
    }

    // Proceed with soft delete (archive)
    const archivedLocation = await prisma.location.update({
      where: { id },
      data: {
        active: false,
        archivedAt: new Date(),
        archivedBy: session.user.id,
        archivedReason: reason || 'No reason provided'
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'LOCATION_ARCHIVED',
        entityType: 'location',
        entityId: id,
        metadata: {
          locationName: archivedLocation.name,
          reason: reason || 'No reason provided'
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Location archived successfully',
      location: archivedLocation
    })

  } catch (error) {
    console.error('Error archiving location:', error)
    return NextResponse.json(
      { error: 'Failed to archive location' },
      { status: 500 }
    )
  }
}