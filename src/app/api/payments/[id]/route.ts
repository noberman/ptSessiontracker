import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateUnlockedSessions, getPaymentSummary } from '@/lib/payments'

/**
 * PUT /api/payments/[id]
 * Edit an existing payment.
 * Editable: amount, paymentDate, paymentMethod, notes, salesAttributedToId, salesAttributedTo2Id.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!['ADMIN', 'PT_MANAGER', 'CLUB_MANAGER'].includes(session.user.role)) {
    return NextResponse.json(
      { error: 'Only managers and admins can edit payments' },
      { status: 403 }
    )
  }

  const { id: paymentId } = await params

  try {
    const body = await request.json()
    const {
      amount,
      paymentDate,
      paymentMethod,
      notes,
      salesAttributedToId,
      salesAttributedTo2Id,
    } = body

    // Fetch existing payment with package data
    const existingPayment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        package: {
          include: {
            payments: true,
            client: {
              select: { organizationId: true },
            },
            _count: {
              select: {
                sessions: {
                  where: { cancelled: false },
                },
              },
            },
          },
        },
      },
    })

    if (!existingPayment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    if (existingPayment.package.client.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Build update data — only include fields that were provided
    const updateData: Record<string, unknown> = {}

    if (amount !== undefined) {
      if (typeof amount !== 'number' || amount <= 0) {
        return NextResponse.json(
          { error: 'Amount must be a positive number' },
          { status: 400 }
        )
      }

      // Check amount doesn't exceed remaining balance (excluding this payment)
      const otherPaymentsTotal = existingPayment.package.payments
        .filter((p) => p.id !== paymentId)
        .reduce((sum, p) => sum + p.amount, 0)
      const remainingBalance = existingPayment.package.totalValue - otherPaymentsTotal

      if (amount > remainingBalance + 0.01) {
        return NextResponse.json(
          { error: `Amount exceeds remaining balance of $${remainingBalance.toFixed(2)}` },
          { status: 400 }
        )
      }

      // Check reducing amount won't lock used sessions
      const newTotalPaid = otherPaymentsTotal + amount
      const newUnlockedSessions = calculateUnlockedSessions(
        newTotalPaid,
        existingPayment.package.totalValue,
        existingPayment.package.totalSessions
      )
      const usedSessions = existingPayment.package._count.sessions

      if (usedSessions > newUnlockedSessions) {
        return NextResponse.json(
          {
            error: `Cannot reduce payment. ${usedSessions} sessions have been used, but this amount would only leave ${newUnlockedSessions} sessions unlocked.`,
          },
          { status: 400 }
        )
      }

      updateData.amount = amount
    }

    if (paymentDate !== undefined) {
      updateData.paymentDate = new Date(paymentDate)
    }

    if (paymentMethod !== undefined) {
      const validMethods = ['CARD', 'BANK_TRANSFER', 'OTHER']
      if (!validMethods.includes(paymentMethod)) {
        return NextResponse.json(
          { error: 'Invalid payment method' },
          { status: 400 }
        )
      }
      updateData.paymentMethod = paymentMethod
    }

    if (notes !== undefined) {
      updateData.notes = notes || null
    }

    // Sales attribution — allow explicitly setting to null to remove attribution
    if ('salesAttributedToId' in body) {
      updateData.salesAttributedToId = salesAttributedToId || null
    }
    if ('salesAttributedTo2Id' in body) {
      updateData.salesAttributedTo2Id = salesAttributedTo2Id || null
    }

    // Cannot attribute to the same person twice
    const finalAttr1 = 'salesAttributedToId' in body
      ? salesAttributedToId
      : existingPayment.salesAttributedToId
    const finalAttr2 = 'salesAttributedTo2Id' in body
      ? salesAttributedTo2Id
      : existingPayment.salesAttributedTo2Id
    if (finalAttr1 && finalAttr2 && finalAttr1 === finalAttr2) {
      return NextResponse.json(
        { error: 'Cannot attribute sales commission to the same person twice' },
        { status: 400 }
      )
    }

    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: updateData,
      include: {
        package: {
          select: {
            id: true,
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
        createdBy: {
          select: { name: true },
        },
      },
    })

    const summary = await getPaymentSummary(existingPayment.packageId)

    return NextResponse.json({
      payment: {
        id: updatedPayment.id,
        amount: updatedPayment.amount,
        paymentDate: updatedPayment.paymentDate,
        paymentMethod: updatedPayment.paymentMethod,
        notes: updatedPayment.notes,
        packageName: updatedPayment.package.name,
        clientName: updatedPayment.package.client.name,
        trainerName: updatedPayment.package.client.primaryTrainer?.name || null,
        salesAttributedTo: updatedPayment.salesAttributedTo?.name || null,
        salesAttributedTo2: updatedPayment.salesAttributedTo2?.name || null,
        createdBy: updatedPayment.createdBy?.name || null,
      },
      summary,
    })
  } catch (error) {
    console.error('Error updating payment:', error)
    return NextResponse.json(
      { error: 'Failed to update payment' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/payments/[id]
 * Delete a payment.
 * Validates that deletion won't lock sessions already used.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!['ADMIN', 'PT_MANAGER', 'CLUB_MANAGER'].includes(session.user.role)) {
    return NextResponse.json(
      { error: 'Only managers and admins can delete payments' },
      { status: 403 }
    )
  }

  const { id: paymentId } = await params

  try {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        package: {
          include: {
            payments: true,
            client: {
              select: { organizationId: true },
            },
            _count: {
              select: {
                sessions: {
                  where: { cancelled: false },
                },
              },
            },
          },
        },
      },
    })

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    if (payment.package.client.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check deletion won't lock used sessions
    const currentPaidAmount = payment.package.payments.reduce(
      (sum, p) => sum + p.amount,
      0
    )
    const newPaidAmount = currentPaidAmount - payment.amount
    const newUnlockedSessions = calculateUnlockedSessions(
      newPaidAmount,
      payment.package.totalValue,
      payment.package.totalSessions
    )
    const usedSessions = payment.package._count.sessions

    if (usedSessions > newUnlockedSessions) {
      return NextResponse.json(
        {
          error: `Cannot delete payment. ${usedSessions} sessions have been used, but deleting this payment would only leave ${newUnlockedSessions} sessions unlocked. Please delete or cancel some sessions first.`,
        },
        { status: 400 }
      )
    }

    await prisma.payment.delete({
      where: { id: paymentId },
    })

    const summary = await getPaymentSummary(payment.packageId)

    return NextResponse.json({
      message: 'Payment deleted successfully',
      summary,
    })
  } catch (error) {
    console.error('Error deleting payment:', error)
    return NextResponse.json(
      { error: 'Failed to delete payment' },
      { status: 500 }
    )
  }
}
