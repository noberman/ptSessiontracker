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

  // Only admins can delete locations
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Only administrators can delete locations' },
      { status: 403 }
    )
  }

  try {
    // Check if location exists and has dependencies
    const location = await prisma.location.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            clients: true,
            sessions: true
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

    // Don't allow deletion if there are associated records
    if (location._count.users > 0 || location._count.clients > 0 || location._count.sessions > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete location with associated trainers, clients, or sessions. Deactivate instead.' 
        },
        { status: 400 }
      )
    }

    // Soft delete by setting inactive
    await prisma.location.update({
      where: { id },
      data: { active: false }
    })

    // TODO: Add audit log

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting location:', error)
    return NextResponse.json(
      { error: 'Failed to delete location' },
      { status: 500 }
    )
  }
}