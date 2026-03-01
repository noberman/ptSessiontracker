import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkAvailabilityPermission, validateTimes } from '@/lib/availability'

// GET /api/availability?trainerId=xxx — List availability entries for a trainer
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const trainerId = request.nextUrl.searchParams.get('trainerId')
    if (!trainerId) {
      return NextResponse.json({ error: 'trainerId is required' }, { status: 400 })
    }

    // Verify trainer belongs to same organization
    const trainer = await prisma.user.findFirst({
      where: { id: trainerId, organizationId: session.user.organizationId },
    })
    if (!trainer) {
      return NextResponse.json({ error: 'Trainer not found' }, { status: 404 })
    }

    const entries = await prisma.trainerAvailability.findMany({
      where: {
        trainerId,
        organizationId: session.user.organizationId,
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    })

    return NextResponse.json(entries)
  } catch (error) {
    console.error('Failed to fetch availability:', error)
    return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 })
  }
}

// POST /api/availability — Create an availability entry
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { trainerId, dayOfWeek, startTime, endTime, specificDate, isAvailable } = body

    if (!trainerId || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'trainerId, startTime, and endTime are required' },
        { status: 400 }
      )
    }

    // Permission check (organizationId is verified non-null above)
    const permError = await checkAvailabilityPermission(
      { user: { id: session.user.id, role: session.user.role, organizationId: session.user.organizationId! } },
      trainerId
    )
    if (permError) return permError

    // Validate time format (HH:mm, 15-min increments)
    const timeError = validateTimes(startTime, endTime)
    if (timeError) return timeError

    // Either dayOfWeek OR specificDate, not both
    if (dayOfWeek !== undefined && dayOfWeek !== null && specificDate) {
      return NextResponse.json(
        { error: 'Provide either dayOfWeek or specificDate, not both' },
        { status: 400 }
      )
    }
    if (body.dayOfWeek === undefined && !specificDate) {
      return NextResponse.json(
        { error: 'Either dayOfWeek or specificDate is required' },
        { status: 400 }
      )
    }

    // Validate dayOfWeek
    if (dayOfWeek !== undefined && dayOfWeek !== null) {
      if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
        return NextResponse.json(
          { error: 'dayOfWeek must be an integer 0-6 (0=Sunday)' },
          { status: 400 }
        )
      }
    }

    // Validate specificDate
    let parsedDate: Date | null = null
    if (specificDate) {
      parsedDate = new Date(specificDate)
      if (isNaN(parsedDate.getTime())) {
        return NextResponse.json(
          { error: 'specificDate must be a valid date' },
          { status: 400 }
        )
      }
    }

    const entry = await prisma.trainerAvailability.create({
      data: {
        trainerId,
        organizationId: session.user.organizationId,
        dayOfWeek: dayOfWeek !== undefined && dayOfWeek !== null ? dayOfWeek : null,
        startTime,
        endTime,
        specificDate: parsedDate,
        isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : true,
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'AVAILABILITY_CREATED',
        userId: session.user.id,
        entityType: 'TrainerAvailability',
        entityId: entry.id,
        newValue: {
          trainerId,
          dayOfWeek: entry.dayOfWeek,
          startTime,
          endTime,
          specificDate: parsedDate?.toISOString() ?? null,
          isAvailable: entry.isAvailable,
        },
      },
    })

    return NextResponse.json(entry, { status: 201 })
  } catch (error) {
    console.error('Failed to create availability:', error)
    return NextResponse.json({ error: 'Failed to create availability' }, { status: 500 })
  }
}
