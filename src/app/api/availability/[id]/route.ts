import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkAvailabilityPermission, validateTimes } from '@/lib/availability'

interface RouteParams {
  params: Promise<{ id: string }>
}

// PUT /api/availability/[id] — Update an availability entry
export async function PUT(request: NextRequest, props: RouteParams) {
  const params = await props.params

  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const existing = await prisma.trainerAvailability.findFirst({
      where: { id: params.id, organizationId: session.user.organizationId },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Availability entry not found' }, { status: 404 })
    }

    // Permission check
    const permError = await checkAvailabilityPermission(session as any, existing.trainerId)
    if (permError) return permError

    const body = await request.json()
    const { dayOfWeek, startTime, endTime, specificDate, isAvailable } = body

    // Validate times if provided
    const st = startTime ?? existing.startTime
    const et = endTime ?? existing.endTime
    const timeError = validateTimes(st, et)
    if (timeError) return timeError

    // Validate dayOfWeek if provided
    if (dayOfWeek !== undefined && dayOfWeek !== null) {
      if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
        return NextResponse.json(
          { error: 'dayOfWeek must be an integer 0-6 (0=Sunday)' },
          { status: 400 }
        )
      }
    }

    // Validate specificDate if provided
    let parsedDate: Date | null | undefined = undefined
    if (specificDate !== undefined) {
      if (specificDate === null) {
        parsedDate = null
      } else {
        parsedDate = new Date(specificDate)
        if (isNaN(parsedDate.getTime())) {
          return NextResponse.json(
            { error: 'specificDate must be a valid date' },
            { status: 400 }
          )
        }
      }
    }

    const oldValue = {
      dayOfWeek: existing.dayOfWeek,
      startTime: existing.startTime,
      endTime: existing.endTime,
      specificDate: existing.specificDate?.toISOString() ?? null,
      isAvailable: existing.isAvailable,
    }

    const entry = await prisma.trainerAvailability.update({
      where: { id: params.id },
      data: {
        ...(dayOfWeek !== undefined && { dayOfWeek }),
        ...(startTime && { startTime }),
        ...(endTime && { endTime }),
        ...(parsedDate !== undefined && { specificDate: parsedDate }),
        ...(isAvailable !== undefined && { isAvailable: Boolean(isAvailable) }),
      },
    })

    await prisma.auditLog.create({
      data: {
        action: 'AVAILABILITY_UPDATED',
        userId: session.user.id,
        entityType: 'TrainerAvailability',
        entityId: entry.id,
        oldValue: oldValue,
        newValue: {
          dayOfWeek: entry.dayOfWeek,
          startTime: entry.startTime,
          endTime: entry.endTime,
          specificDate: entry.specificDate?.toISOString() ?? null,
          isAvailable: entry.isAvailable,
        },
      },
    })

    return NextResponse.json(entry)
  } catch (error) {
    console.error('Failed to update availability:', error)
    return NextResponse.json({ error: 'Failed to update availability' }, { status: 500 })
  }
}

// DELETE /api/availability/[id] — Delete an availability entry
export async function DELETE(request: NextRequest, props: RouteParams) {
  const params = await props.params

  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const existing = await prisma.trainerAvailability.findFirst({
      where: { id: params.id, organizationId: session.user.organizationId },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Availability entry not found' }, { status: 404 })
    }

    // Permission check
    const permError = await checkAvailabilityPermission(session as any, existing.trainerId)
    if (permError) return permError

    await prisma.trainerAvailability.delete({
      where: { id: params.id },
    })

    await prisma.auditLog.create({
      data: {
        action: 'AVAILABILITY_DELETED',
        userId: session.user.id,
        entityType: 'TrainerAvailability',
        entityId: params.id,
        oldValue: {
          trainerId: existing.trainerId,
          dayOfWeek: existing.dayOfWeek,
          startTime: existing.startTime,
          endTime: existing.endTime,
          specificDate: existing.specificDate?.toISOString() ?? null,
          isAvailable: existing.isAvailable,
        },
      },
    })

    return NextResponse.json({ message: 'Availability entry deleted' })
  } catch (error) {
    console.error('Failed to delete availability:', error)
    return NextResponse.json({ error: 'Failed to delete availability' }, { status: 500 })
  }
}
