import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

    const client = await prisma.client.findUnique({
      where: { id },
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
    } else if (session.user.role === 'CLUB_MANAGER' && session.user.locationId) {
      // Club managers can only view clients at their location
      if (client.locationId !== session.user.locationId) {
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

    // Check permissions for club managers
    if (session.user.role === 'CLUB_MANAGER' && session.user.locationId) {
      if (currentClient.locationId !== session.user.locationId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      // Club managers can't move clients to other locations
      if (locationId && locationId !== session.user.locationId) {
        return NextResponse.json(
          { error: 'Cannot move client to another location' },
          { status: 403 }
        )
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
      const trainer = await prisma.user.findFirst({
        where: {
          id: primaryTrainerId,
          role: { in: ['TRAINER', 'PT_MANAGER'] },
          active: true,
          locationId: locationId || currentClient.locationId || undefined,
        },
      })

      if (!trainer) {
        return NextResponse.json(
          { error: 'Invalid trainer selection' },
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