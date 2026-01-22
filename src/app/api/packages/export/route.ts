import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const clientIds = searchParams.get('clientIds')?.split(',').filter(Boolean) || []
  const locationIds = searchParams.get('locationIds')?.split(',').filter(Boolean) || []
  const packageTypes = searchParams.get('packageTypes')?.split(',').filter(Boolean) || []
  const activeStatuses = searchParams.get('activeStatuses')?.split(',').filter(Boolean) || []
  const expirationStatus = searchParams.get('expirationStatus') || ''
  const startDate = searchParams.get('startDate') || ''
  const endDate = searchParams.get('endDate') || ''

  try {
    // Build where clause (same logic as packages page)
    const where: any = {
      organizationId: session.user.organizationId
    }

    // Filter by clients
    if (clientIds.length > 0) {
      where.clientId = { in: clientIds }
    }

    // Filter by locations
    if (locationIds.length > 0) {
      where.client = {
        ...where.client,
        locationId: { in: locationIds }
      }
    }

    // Filter by package types
    if (packageTypes.length > 0) {
      where.packageType = { in: packageTypes }
    }

    // Filter by active status
    if (activeStatuses.length === 1) {
      where.active = activeStatuses[0] === 'true'
    } else if (activeStatuses.length === 0) {
      // Default to showing only active packages
      where.active = true
    }
    // If both are selected, show all (no filter)

    // Filter by expiration status
    if (expirationStatus) {
      const now = new Date()
      const thirtyDaysFromNow = new Date()
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

      switch (expirationStatus) {
        case 'expired':
          where.expiresAt = { lt: now }
          break
        case 'expiring_soon':
          where.expiresAt = { gte: now, lte: thirtyDaysFromNow }
          break
        case 'not_expired':
          where.expiresAt = { gt: now }
          break
        case 'no_expiry':
          where.expiresAt = null
          break
      }
    }

    // Date range filter
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        where.createdAt.gte = new Date(startDate)
      }
      if (endDate) {
        const endDateTime = new Date(endDate)
        endDateTime.setHours(23, 59, 59, 999)
        where.createdAt.lte = endDateTime
      }
    }

    // Role-based restrictions
    if (session.user.role === 'TRAINER' || session.user.role === 'CLUB_MANAGER' || session.user.role === 'PT_MANAGER') {
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
        where.client = {
          ...where.client,
          locationId: { in: accessibleLocationIds }
        }
      } else if (session.user.role === 'TRAINER') {
        where.client = {
          ...where.client,
          primaryTrainerId: session.user.id
        }
      } else {
        where.id = 'no-access'
      }
    }

    // Fetch all packages (no pagination for export)
    const packages = await prisma.package.findMany({
      where,
      select: {
        id: true,
        name: true,
        packageType: true,
        totalSessions: true,
        remainingSessions: true,
        totalValue: true,
        sessionValue: true,
        active: true,
        startDate: true,
        expiresAt: true,
        createdAt: true,
        client: {
          select: {
            name: true,
            email: true,
            location: {
              select: {
                name: true
              }
            },
            primaryTrainer: {
              select: {
                name: true
              }
            }
          }
        },
        _count: {
          select: {
            sessions: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Helper function to get status
    const getStatus = (pkg: any) => {
      if (pkg.expiresAt && new Date(pkg.expiresAt) < new Date()) {
        return 'Expired'
      }
      if (pkg.remainingSessions === 0) {
        return 'Completed'
      }
      if (pkg.active) {
        return 'Active'
      }
      return 'Inactive'
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

    // Helper function to format currency (no commas for CSV compatibility)
    const formatCurrency = (amount: number) => {
      return amount.toFixed(2)
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
      'Package Name',
      'Package Type',
      'Client Name',
      'Client Email',
      'Client Location',
      'Primary Trainer',
      'Total Sessions',
      'Remaining Sessions',
      'Sessions Used',
      'Total Value',
      'Session Value',
      'Status',
      'Start Date',
      'Expiry Date',
      'Created Date'
    ]

    const rows = packages.map(pkg => [
      escapeCSV(pkg.name),
      escapeCSV(pkg.packageType),
      escapeCSV(pkg.client.name),
      escapeCSV(pkg.client.email),
      escapeCSV(pkg.client.location?.name || ''),
      escapeCSV(pkg.client.primaryTrainer?.name || ''),
      pkg.totalSessions,
      pkg.remainingSessions,
      pkg._count.sessions,
      formatCurrency(pkg.totalValue),
      formatCurrency(pkg.sessionValue),
      escapeCSV(getStatus(pkg)),
      formatDate(pkg.startDate),
      formatDate(pkg.expiresAt),
      formatDate(pkg.createdAt)
    ])

    const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n')

    // Return CSV response
    const today = new Date().toISOString().split('T')[0]
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="packages-export-${today}.csv"`
      }
    })
  } catch (error) {
    console.error('Error exporting packages:', error)
    return NextResponse.json(
      { error: 'Failed to export packages' },
      { status: 500 }
    )
  }
}
