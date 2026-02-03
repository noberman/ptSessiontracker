import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { userHasLocationAccess } from '@/lib/user-locations'

// GET /api/clients/[id] - Get single client details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const client = await prisma.client.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId  // Ensure client belongs to user's org
      },
      include: {
        location: true,
        primaryTrainer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        packages: {
          where: {
            remainingSessions: {
              gt: 0,
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        sessions: {
          take: 10,
          orderBy: {
            sessionDate: 'desc',
          },
          include: {
            trainer: {
              select: {
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            sessions: true,
            packages: true,
          },
        },
      },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Check permissions
    if (session.user.role === 'TRAINER') {
      // Trainers can only view their assigned clients
      if (client.primaryTrainerId !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else if (session.user.role === 'CLUB_MANAGER' || session.user.role === 'PT_MANAGER') {
      // Club managers and PT Managers can only view clients at their accessible locations
      const hasAccess = await userHasLocationAccess(
        session.user.id,
        session.user.role,
        client.locationId
      )
      if (!hasAccess) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    return NextResponse.json(client)
  } catch (error) {
    console.error('Error fetching client:', error)
    return NextResponse.json(
      { error: 'Failed to fetch client' },
      { status: 500 }
    )
  }
}

// PUT /api/clients/[id] - Update client information
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Trainers cannot update clients
    if (session.user.role === 'TRAINER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { name, email, phone, locationId, primaryTrainerId, active } = body

    // Get current client
    const currentClient = await prisma.client.findUnique({
      where: { id },
    })

    if (!currentClient) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Check permissions for club managers and PT managers
    if (session.user.role === 'CLUB_MANAGER' || session.user.role === 'PT_MANAGER') {
      // Check if user has access to client's current location
      const hasCurrentLocationAccess = await userHasLocationAccess(
        session.user.id,
        session.user.role,
        currentClient.locationId
      )
      if (!hasCurrentLocationAccess) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      
      // If trying to move client to a new location, check access to that location too
      if (locationId && locationId !== currentClient.locationId) {
        const hasNewLocationAccess = await userHasLocationAccess(
          session.user.id,
          session.user.role,
          locationId
        )
        if (!hasNewLocationAccess) {
          return NextResponse.json(
            { error: 'Cannot move client to a location you don\'t have access to' },
            { status: 403 }
          )
        }
      }
    }

    // Check if email is being changed and if it's unique within the organization
    if (email && email !== currentClient.email) {
      const existingClient = await prisma.client.findFirst({
        where: { 
          email,
          organizationId: session.user.organizationId,
          NOT: {
            id: id
          }
        },
      })
      if (existingClient) {
        return NextResponse.json(
          { error: 'Email already in use within this organization' },
          { status: 400 }
        )
      }
    }

    // Validate trainer assignment (PT Managers can also be trainers)
    if (primaryTrainerId) {
      const targetLocationId = locationId || currentClient.locationId
      const trainer = await prisma.user.findFirst({
        where: {
          id: primaryTrainerId,
          role: { in: ['TRAINER', 'PT_MANAGER'] },
          active: true,
          organizationId: session.user.organizationId,
          // Check UserLocation records
          locations: {
            some: {
              locationId: targetLocationId
            }
          }
        },
      })

      if (!trainer) {
        return NextResponse.json(
          { error: 'Invalid trainer selection - trainer must have access to the client\'s location' },
          { status: 400 }
        )
      }
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (email !== undefined) updateData.email = email
    if (phone !== undefined) updateData.phone = phone
    if (locationId !== undefined) updateData.locationId = locationId
    if (primaryTrainerId !== undefined) updateData.primaryTrainerId = primaryTrainerId
    if (active !== undefined && session.user.role === 'ADMIN') updateData.active = active

    // Update client
    const updatedClient = await prisma.client.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        locationId: true,
        primaryTrainerId: true,
        active: true,
        updatedAt: true,
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'CLIENT_UPDATED',
        userId: session.user.id,
        entityType: 'Client',
        entityId: updatedClient.id,
        oldValue: currentClient,
        newValue: updateData,
      },
    })

    return NextResponse.json(updatedClient)
  } catch (error) {
    console.error('Error updating client:', error)
    return NextResponse.json(
      { error: 'Failed to update client' },
      { status: 500 }
    )
  }
}

// DELETE /api/clients/[id] - Soft delete client
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can delete clients
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Soft delete (set inactive)
    const client = await prisma.client.update({
      where: { id },
      data: { active: false },
      select: {
        id: true,
        name: true,
        email: true,
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'CLIENT_DELETED',
        userId: session.user.id,
        entityType: 'Client',
        entityId: client.id,
        oldValue: { active: true },
        newValue: { active: false },
      },
    })

    return NextResponse.json({ message: 'Client deactivated successfully' })
  } catch (error) {
    console.error('Error deleting client:', error)
    return NextResponse.json(
      { error: 'Failed to delete client' },
      { status: 500 }
    )
  }
}