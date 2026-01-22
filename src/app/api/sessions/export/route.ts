import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { displaySessionTime } from '@/utils/timezone'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const clientIds = searchParams.get('clientIds')?.split(',').filter(Boolean) || []
  const trainerIds = searchParams.get('trainerIds')?.split(',').filter(Boolean) || []
  const locationIds = searchParams.get('locationIds')?.split(',').filter(Boolean) || []
  const validatedStatuses = searchParams.get('validatedStatuses')?.split(',').filter(Boolean) || []
  const startDate = searchParams.get('startDate') || ''
  const endDate = searchParams.get('endDate') || ''

  try {
    // Get organization timezone
    const organization = await prisma.organization.findUnique({
      where: { id: session.user.organizationId },
      select: { timezone: true }
    })
    const orgTimezone = organization?.timezone || 'Asia/Singapore'

    // Build where clause (same logic as sessions page)
    const where: any = {
      organizationId: session.user.organizationId
    }

    // Filter by clients
    if (clientIds.length > 0) {
      where.clientId = { in: clientIds }
    }

    // Filter by trainers
    if (trainerIds.length > 0) {
      where.trainerId = { in: trainerIds }
    } else if (session.user.role === 'TRAINER') {
      // Trainers can only see their own sessions
      where.trainerId = session.user.id
    }

    // Filter by locations
    if (locationIds.length > 0) {
      where.locationId = { in: locationIds }
    } else if (session.user.role === 'CLUB_MANAGER' || session.user.role === 'PT_MANAGER') {
      // Club managers and PT managers see sessions at their accessible locations
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          locations: {
            select: { locationId: true }
          }
        }
      })

      const accessibleLocationIds: string[] = []
      if (user?.locations) {
        accessibleLocationIds.push(...user.locations.map(l => l.locationId))
      }

      if (accessibleLocationIds.length > 0) {
        where.locationId = { in: accessibleLocationIds }
      }
    }

    // Filter by validation status
    if (validatedStatuses.length === 1) {
      where.validated = validatedStatuses[0] === 'true'
    } else if (validatedStatuses.length > 1) {
      where.OR = validatedStatuses.map(status => ({ validated: status === 'true' }))
    }

    // Date range filter
    if (startDate || endDate) {
      where.sessionDate = {}
      if (startDate) {
        where.sessionDate.gte = new Date(startDate)
      }
      if (endDate) {
        const endDateTime = new Date(endDate)
        endDateTime.setHours(23, 59, 59, 999)
        where.sessionDate.lte = endDateTime
      }
    }

    // Fetch all sessions (no pagination for export)
    const sessions = await prisma.session.findMany({
      where,
      select: {
        id: true,
        sessionDate: true,
        sessionValue: true,
        validated: true,
        validatedAt: true,
        cancelled: true,
        cancelledAt: true,
        createdAt: true,
        trainer: {
          select: {
            name: true,
            email: true
          }
        },
        client: {
          select: {
            name: true,
            email: true
          }
        },
        location: {
          select: {
            name: true
          }
        },
        package: {
          select: {
            name: true,
            packageType: true
          }
        }
      },
      orderBy: {
        sessionDate: 'desc'
      }
    })

    // Helper function to get status
    const getStatus = (sessionRecord: any) => {
      if (sessionRecord.cancelled) {
        return 'Cancelled'
      }
      if (sessionRecord.validated) {
        return 'Validated'
      }
      return 'Pending'
    }

    // Helper function to format date
    const formatDate = (date: Date | null) => {
      if (!date) return ''
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      })
    }

    // Helper function to format session date with timezone awareness
    const formatSessionDate = (sessionRecord: any) => {
      const displayDate = displaySessionTime(
        sessionRecord.sessionDate,
        sessionRecord.createdAt,
        orgTimezone
      )
      return displayDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      })
    }

    // Helper function to format currency
    const formatCurrency = (amount: number) => {
      return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }

    // Helper function to escape CSV fields
    const escapeCSV = (value: string | number | null | undefined) => {
      if (value === null || value === undefined) return ''
      const str = String(value)
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    // Build CSV
    const headers = [
      'Session Date',
      'Trainer Name',
      'Trainer Email',
      'Client Name',
      'Client Email',
      'Location',
      'Package Name',
      'Package Type',
      'Session Value',
      'Status',
      'Validated At',
      'Created Date'
    ]

    const rows = sessions.map(s => [
      formatSessionDate(s),
      escapeCSV(s.trainer.name),
      escapeCSV(s.trainer.email),
      escapeCSV(s.client.name),
      escapeCSV(s.client.email),
      escapeCSV(s.location?.name || ''),
      escapeCSV(s.package?.name || ''),
      escapeCSV(s.package?.packageType || ''),
      formatCurrency(s.sessionValue),
      escapeCSV(getStatus(s)),
      formatDate(s.validatedAt),
      formatDate(s.createdAt)
    ])

    const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n')

    // Return CSV response
    const today = new Date().toISOString().split('T')[0]
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="sessions-export-${today}.csv"`
      }
    })
  } catch (error) {
    console.error('Error exporting sessions:', error)
    return NextResponse.json(
      { error: 'Failed to export sessions' },
      { status: 500 }
    )
  }
}
