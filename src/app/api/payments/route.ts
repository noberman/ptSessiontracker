import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUserAccessibleLocations } from '@/lib/user-locations'
import { getPaymentSummary } from '@/lib/payments'

/**
 * GET /api/payments
 * List payments for the organization with date, location, trainer, and client filters.
 * Returns payments array + summary (total count, total amount).
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!['ADMIN', 'PT_MANAGER', 'CLUB_MANAGER'].includes(session.user.role)) {
    return NextResponse.json(
      { error: 'Only managers and admins can view payments' },
      { status: 403 }
    )
  }

  const orgId = session.user.organizationId

  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const trainerId = searchParams.get('trainerId')
    const clientId = searchParams.get('clientId')
    const locationId = searchParams.get('locationId')

    // Build where clause — payments don't have org directly,
    // so we filter through package -> client -> organization
    const where: Record<string, unknown> = {
      package: {
        client: {
          organizationId: orgId,
        },
      },
    }

    // Date range filter
    if (startDate || endDate) {
      where.paymentDate = {} as Record<string, Date>
      if (startDate) {
        ;(where.paymentDate as Record<string, Date>).gte = new Date(startDate)
      }
      if (endDate) {
        const endDateTime = new Date(endDate)
        endDateTime.setHours(23, 59, 59, 999)
        ;(where.paymentDate as Record<string, Date>).lte = endDateTime
      }
    }

    // Location scoping — auto-filter for managers
    const packageClientFilter = (where.package as Record<string, unknown>).client as Record<string, unknown>

    if (locationId) {
      // Explicit location filter
      packageClientFilter.primaryTrainer = {
        locations: {
          some: { locationId },
        },
      }
    } else if (session.user.role !== 'ADMIN') {
      // Auto-scope to manager's locations
      const accessibleLocations = await getUserAccessibleLocations(
        session.user.id,
        session.user.role
      )
      if (accessibleLocations && accessibleLocations.length > 0) {
        packageClientFilter.primaryTrainer = {
          locations: {
            some: { locationId: { in: accessibleLocations } },
          },
        }
      } else if (accessibleLocations && accessibleLocations.length === 0) {
        // No location access — return empty
        return NextResponse.json({
          payments: [],
          summary: { totalCount: 0, totalAmount: 0 },
        })
      }
    }

    // Trainer filter
    if (trainerId) {
      packageClientFilter.primaryTrainerId = trainerId
    }

    // Client filter
    if (clientId) {
      packageClientFilter.id = clientId
    }

    const payments = await prisma.payment.findMany({
      where,
      orderBy: { paymentDate: 'desc' },
      include: {
        package: {
          select: {
            id: true,
            name: true,
            client: {
              select: {
                id: true,
                name: true,
                primaryTrainer: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        createdBy: {
          select: { id: true, name: true },
        },
        salesAttributedTo: {
          select: { id: true, name: true },
        },
        salesAttributedTo2: {
          select: { id: true, name: true },
        },
      },
    })

    // Calculate summary
    const totalCount = payments.length
    const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0)

    return NextResponse.json({
      payments: payments.map((p) => ({
        id: p.id,
        amount: p.amount,
        paymentDate: p.paymentDate,
        paymentMethod: p.paymentMethod,
        notes: p.notes,
        createdAt: p.createdAt,
        packageId: p.package.id,
        packageName: p.package.name,
        clientId: p.package.client.id,
        clientName: p.package.client.name,
        trainerId: p.package.client.primaryTrainer?.id || null,
        trainerName: p.package.client.primaryTrainer?.name || null,
        createdById: p.createdBy?.id || null,
        createdByName: p.createdBy?.name || null,
        salesAttributedToId: p.salesAttributedTo?.id || null,
        salesAttributedToName: p.salesAttributedTo?.name || null,
        salesAttributedTo2Id: p.salesAttributedTo2?.id || null,
        salesAttributedTo2Name: p.salesAttributedTo2?.name || null,
      })),
      summary: {
        totalCount,
        totalAmount,
      },
    })
  } catch (error) {
    console.error('Error fetching payments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/payments
 * Create a new payment for a package.
 * Requires packageId, amount, paymentDate, paymentMethod.
 * Optional: notes, salesAttributedToId, salesAttributedTo2Id.
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!['ADMIN', 'PT_MANAGER', 'CLUB_MANAGER'].includes(session.user.role)) {
    return NextResponse.json(
      { error: 'Only managers and admins can record payments' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    const {
      packageId,
      amount,
      paymentDate,
      paymentMethod,
      notes,
      salesAttributedToId,
      salesAttributedTo2Id,
    } = body

    // Validate required fields
    if (!packageId) {
      return NextResponse.json(
        { error: 'Package is required' },
        { status: 400 }
      )
    }

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
        { status: 400 }
      )
    }

    // Validate paymentMethod if provided
    const validMethods = ['CARD', 'BANK_TRANSFER', 'OTHER']
    if (paymentMethod && !validMethods.includes(paymentMethod)) {
      return NextResponse.json(
        { error: 'Invalid payment method' },
        { status: 400 }
      )
    }

    // Cannot attribute to the same person twice
    if (salesAttributedToId && salesAttributedTo2Id && salesAttributedToId === salesAttributedTo2Id) {
      return NextResponse.json(
        { error: 'Cannot attribute sales commission to the same person twice' },
        { status: 400 }
      )
    }

    // Get package with current payments
    const pkg = await prisma.package.findUnique({
      where: { id: packageId },
      include: {
        payments: true,
        client: {
          select: { organizationId: true },
        },
      },
    })

    if (!pkg) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 })
    }

    if (pkg.client.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Validate amount doesn't exceed remaining balance
    const currentPaidAmount = pkg.payments.reduce((sum, p) => sum + p.amount, 0)
    const remainingBalance = pkg.totalValue - currentPaidAmount

    if (amount > remainingBalance + 0.01) {
      return NextResponse.json(
        { error: `Amount exceeds remaining balance of $${remainingBalance.toFixed(2)}` },
        { status: 400 }
      )
    }

    // Create payment
    const payment = await prisma.payment.create({
      data: {
        packageId,
        amount,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        paymentMethod: paymentMethod || 'CARD',
        notes: notes || null,
        createdById: session.user.id,
        salesAttributedToId: salesAttributedToId || null,
        salesAttributedTo2Id: salesAttributedTo2Id || null,
      },
      include: {
        package: {
          select: {
            name: true,
            client: {
              select: {
                name: true,
                primaryTrainer: {
                  select: { name: true },
                },
              },
            },
          },
        },
        salesAttributedTo: {
          select: { id: true, name: true },
        },
        salesAttributedTo2: {
          select: { id: true, name: true },
        },
      },
    })

    const summary = await getPaymentSummary(packageId)

    return NextResponse.json(
      {
        payment: {
          id: payment.id,
          amount: payment.amount,
          paymentDate: payment.paymentDate,
          paymentMethod: payment.paymentMethod,
          notes: payment.notes,
          packageName: payment.package.name,
          clientName: payment.package.client.name,
          trainerName: payment.package.client.primaryTrainer?.name || null,
          salesAttributedTo: payment.salesAttributedTo?.name || null,
          salesAttributedTo2: payment.salesAttributedTo2?.name || null,
        },
        summary,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error recording payment:', error)
    return NextResponse.json(
      { error: 'Failed to record payment' },
      { status: 500 }
    )
  }
}
