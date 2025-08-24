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
    const trainingSession = await prisma.session.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          }
        },
        trainer: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        location: {
          select: {
            id: true,
            name: true,
          }
        },
        package: {
          select: {
            id: true,
            name: true,
            packageType: true,
            totalSessions: true,
            remainingSessions: true,
          }
        }
      }
    })

    if (!trainingSession) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Check permissions
    if (session.user.role === 'TRAINER' && trainingSession.trainerId !== session.user.id) {
      return NextResponse.json(
        { error: 'You can only view your own sessions' },
        { status: 403 }
      )
    }

    if (session.user.role === 'CLUB_MANAGER' && session.user.locationId !== trainingSession.locationId) {
      return NextResponse.json(
        { error: 'You can only view sessions at your location' },
        { status: 403 }
      )
    }

    return NextResponse.json(trainingSession)
  } catch (error) {
    console.error('Error fetching session:', error)
    return NextResponse.json(
      { error: 'Failed to fetch session' },
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

  try {
    const body = await request.json()
    const {
      sessionDate,
      notes,
      validated
    } = body

    // Get the existing session
    const existingSession = await prisma.session.findUnique({
      where: { id }
    })

    if (!existingSession) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Check permissions
    if (session.user.role === 'TRAINER') {
      if (existingSession.trainerId !== session.user.id) {
        return NextResponse.json(
          { error: 'You can only edit your own sessions' },
          { status: 403 }
        )
      }
      // Trainers cannot change validation status
      if (validated !== undefined) {
        return NextResponse.json(
          { error: 'Trainers cannot change validation status' },
          { status: 403 }
        )
      }
    }

    if (session.user.role === 'CLUB_MANAGER' && session.user.locationId) {
      if (existingSession.locationId !== session.user.locationId) {
        return NextResponse.json(
          { error: 'You can only edit sessions at your location' },
          { status: 403 }
        )
      }
    }

    // Build update data
    const updateData: any = {
      updatedAt: new Date(),
    }

    if (sessionDate !== undefined) {
      updateData.sessionDate = new Date(sessionDate)
    }
    if (notes !== undefined) {
      updateData.notes = notes
    }
    if (validated !== undefined && (session.user.role === 'PT_MANAGER' || session.user.role === 'ADMIN')) {
      updateData.validated = validated
      if (validated) {
        updateData.validatedAt = new Date()
      }
    }

    // Update the session
    const updatedSession = await prisma.$transaction(async (tx) => {
      const updated = await tx.session.update({
        where: { id },
        data: updateData,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          },
          trainer: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          },
          location: {
            select: {
              id: true,
              name: true,
            }
          },
          package: {
            select: {
              id: true,
              name: true,
              packageType: true,
            }
          }
        }
      })

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'UPDATE',
          entityType: 'SESSION',
          entityId: id,
          newValue: updateData
        }
      })

      return updated
    })

    return NextResponse.json(updatedSession)
  } catch (error) {
    console.error('Error updating session:', error)
    return NextResponse.json(
      { error: 'Failed to update session' },
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

  // Only admins and PT managers can delete sessions
  if (session.user.role !== 'ADMIN' && session.user.role !== 'PT_MANAGER') {
    return NextResponse.json(
      { error: 'Only administrators can delete sessions' },
      { status: 403 }
    )
  }

  try {
    // Get the session to check if it exists and get package info
    const existingSession = await prisma.session.findUnique({
      where: { id },
      include: {
        package: true
      }
    })

    if (!existingSession) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Delete the session and restore package session if needed
    await prisma.$transaction(async (tx) => {
      // Delete the session
      await tx.session.delete({
        where: { id }
      })

      // Restore the package session if the session was not validated
      if (!existingSession.validated && existingSession.package) {
        await tx.package.update({
          where: { id: existingSession.packageId! },
          data: {
            remainingSessions: existingSession.package.remainingSessions + 1
          }
        })
      }

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'DELETE',
          entityType: 'SESSION',
          entityId: id,
          oldValue: {
            clientId: existingSession.clientId,
            trainerId: existingSession.trainerId,
            sessionDate: existingSession.sessionDate,
            validated: existingSession.validated
          }
        }
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting session:', error)
    return NextResponse.json(
      { error: 'Failed to delete session' },
      { status: 500 }
    )
  }
}