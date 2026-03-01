import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { resolveAvailability } from '@/lib/availability'

// GET /api/availability/resolve?trainerId=xxx&startDate=yyyy-mm-dd&endDate=yyyy-mm-dd
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const trainerId = request.nextUrl.searchParams.get('trainerId')
    const startDateStr = request.nextUrl.searchParams.get('startDate')
    const endDateStr = request.nextUrl.searchParams.get('endDate')

    if (!trainerId || !startDateStr || !endDateStr) {
      return NextResponse.json(
        { error: 'trainerId, startDate, and endDate are required' },
        { status: 400 }
      )
    }

    // Validate dates
    const startDate = new Date(startDateStr + 'T00:00:00')
    const endDate = new Date(endDateStr + 'T00:00:00')
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: 'startDate and endDate must be valid YYYY-MM-DD dates' },
        { status: 400 }
      )
    }
    if (startDate > endDate) {
      return NextResponse.json(
        { error: 'startDate must be before or equal to endDate' },
        { status: 400 }
      )
    }

    // Limit range to 60 days to prevent abuse
    const diffMs = endDate.getTime() - startDate.getTime()
    const diffDays = diffMs / (1000 * 60 * 60 * 24)
    if (diffDays > 60) {
      return NextResponse.json(
        { error: 'Date range cannot exceed 60 days' },
        { status: 400 }
      )
    }

    // Verify trainer belongs to same organization
    const trainer = await prisma.user.findFirst({
      where: { id: trainerId, organizationId: session.user.organizationId },
    })
    if (!trainer) {
      return NextResponse.json({ error: 'Trainer not found' }, { status: 404 })
    }

    // Fetch all availability entries for this trainer
    const entries = await prisma.trainerAvailability.findMany({
      where: {
        trainerId,
        organizationId: session.user.organizationId,
      },
    })

    const resolved = resolveAvailability(entries, startDate, endDate)

    // Convert Map to plain object for JSON serialization
    const result: Record<string, { isAvailable: boolean; blocks: { startTime: string; endTime: string }[] }> = {}
    for (const [date, availability] of resolved) {
      result[date] = availability
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to resolve availability:', error)
    return NextResponse.json({ error: 'Failed to resolve availability' }, { status: 500 })
  }
}
