import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUserAccessibleLocations } from '@/lib/user-locations'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const searchParams = request.nextUrl.searchParams
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '10')
  const search = searchParams.get('search') || ''
  const clientId = searchParams.get('clientId') || ''
  const status = searchParams.get('status') || ''
  
  const skip = (page - 1) * limit
  
  const where: any = {}
  
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { client: { name: { contains: search, mode: 'insensitive' } } },
    ]
  }
  
  if (clientId) {
    where.clientId = clientId
  }
  
  if (status) {
    if (status === 'active') {
      where.status = 'ACTIVE'
    } else if (status === 'expired') {
      where.OR = [
        { status: 'EXPIRED' },
        {
          AND: [
            { status: 'ACTIVE' },
            { expiryDate: { lt: new Date() } }
          ]
        }
      ]
    } else if (status === 'completed') {
      where.sessionsRemaining = 0
    }
  }
  
  // Role-based filtering
  if (session.user.role === 'TRAINER') {
    // Trainers see packages for their clients
    where.client = {
      primaryTrainerId: session.user.id
    }
  } else if (session.user.role === 'CLUB_MANAGER' || session.user.role === 'PT_MANAGER') {
    // Club managers and PT managers see packages for clients at their accessible locations
    const accessibleLocations = await getUserAccessibleLocations(session.user.id, session.user.role)
    if (accessibleLocations && accessibleLocations.length > 0) {
      where.client = {
        locationId: { in: accessibleLocations }
      }
    } else {
      // No accessible locations
      where.id = 'no-access'
    }
  }
  // ADMIN sees all (no additional filter)
  
  try {
    const [packagesRaw, total] = await Promise.all([
      prisma.package.findMany({
        where,
        skip,
        take: limit,
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
          client: {
            select: {
              id: true,
              name: true,
              email: true,
              primaryTrainer: {
                select: {
                  id: true,
                  name: true,
                }
              }
            }
          },
          payments: {
            select: {
              amount: true
            }
          },
          _count: {
            select: {
              sessions: {
                where: { cancelled: false }
              }
            }
          },
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.package.count({ where }),
    ])

    // Add payment summary to each package
    const packages = packagesRaw.map(pkg => {
      const paidAmount = pkg.payments.reduce((sum, p) => sum + p.amount, 0)
      const paymentProgress = pkg.totalValue > 0
        ? Math.min(100, (paidAmount / pkg.totalValue) * 100)
        : 100
      const isFullyPaid = paidAmount >= pkg.totalValue

      // Calculate unlocked sessions
      const unlockedSessions = pkg.totalValue > 0 && paidAmount < pkg.totalValue
        ? Math.floor((paidAmount / pkg.totalValue) * pkg.totalSessions)
        : pkg.totalSessions

      const usedSessions = pkg._count.sessions
      const availableSessions = Math.max(0, unlockedSessions - usedSessions)

      // Remove raw payments array and add computed summary
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { payments, ...pkgWithoutPayments } = pkg

      return {
        ...pkgWithoutPayments,
        paymentStatus: {
          paidAmount,
          remainingBalance: Math.max(0, pkg.totalValue - paidAmount),
          paymentProgress,
          isFullyPaid,
          unlockedSessions,
          usedSessions,
          availableSessions
        }
      }
    })

    return NextResponse.json({
      packages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching packages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch packages' },
      { status: 500 }
    )
  }
}