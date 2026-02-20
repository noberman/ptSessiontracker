import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getPaymentSummary } from '@/lib/payments'

/**
 * GET /api/packages/[id]/payments
 * Get payment history and summary for a package
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: packageId } = await params

  try {
    // Get package with payments
    const pkg = await prisma.package.findUnique({
      where: { id: packageId },
      include: {
        payments: {
          orderBy: { paymentDate: 'asc' },
          include: {
            createdBy: {
              select: { name: true }
            },
            salesAttributedTo: {
              select: { id: true, name: true }
            },
            salesAttributedTo2: {
              select: { id: true, name: true }
            }
          }
        },
        client: {
          select: { organizationId: true }
        }
      }
    })

    if (!pkg) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 })
    }

    // Verify user has access to this organization
    if (pkg.client.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get payment summary
    const summary = await getPaymentSummary(packageId)

    return NextResponse.json({
      payments: pkg.payments.map(p => ({
        id: p.id,
        amount: p.amount,
        paymentDate: p.paymentDate,
        paymentMethod: p.paymentMethod,
        notes: p.notes,
        createdAt: p.createdAt,
        createdBy: p.createdBy?.name || null,
        salesAttributedToId: p.salesAttributedTo?.id || null,
        salesAttributedToName: p.salesAttributedTo?.name || null,
        salesAttributedTo2Id: p.salesAttributedTo2?.id || null,
        salesAttributedTo2Name: p.salesAttributedTo2?.name || null,
      })),
      summary
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
 * POST /api/packages/[id]/payments
 * Record a new payment for a package
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only admins, PT managers, and club managers can record payments
  if (!['ADMIN', 'PT_MANAGER', 'CLUB_MANAGER'].includes(session.user.role)) {
    return NextResponse.json(
      { error: 'Only managers and admins can record payments' },
      { status: 403 }
    )
  }

  const { id: packageId } = await params

  try {
    const body = await request.json()
    const { amount, paymentDate, notes, paymentMethod, salesAttributedToId, salesAttributedTo2Id } = body

    // Validate amount
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
        { status: 400 }
      )
    }

    // Get package with current payments
    const pkg = await prisma.package.findUnique({
      where: { id: packageId },
      include: {
        payments: true,
        client: {
          select: { organizationId: true }
        }
      }
    })

    if (!pkg) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 })
    }

    // Verify user has access to this organization
    if (pkg.client.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Calculate current paid amount
    const currentPaidAmount = pkg.payments.reduce((sum, p) => sum + p.amount, 0)
    const remainingBalance = pkg.totalValue - currentPaidAmount

    // Validate amount doesn't exceed remaining balance
    if (amount > remainingBalance + 0.01) { // Small tolerance for floating point
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
      }
    })

    // Get updated summary
    const summary = await getPaymentSummary(packageId)

    return NextResponse.json({
      payment: {
        id: payment.id,
        amount: payment.amount,
        paymentDate: payment.paymentDate,
        notes: payment.notes
      },
      summary
    }, { status: 201 })
  } catch (error) {
    console.error('Error recording payment:', error)
    return NextResponse.json(
      { error: 'Failed to record payment' },
      { status: 500 }
    )
  }
}
