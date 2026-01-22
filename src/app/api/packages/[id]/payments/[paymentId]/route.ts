import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateUnlockedSessions, getPaymentSummary } from '@/lib/payments'

/**
 * DELETE /api/packages/[id]/payments/[paymentId]
 * Delete a payment record
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; paymentId: string }> }
) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only admins can delete payments
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Only admins can delete payments' },
      { status: 403 }
    )
  }

  const { id: packageId, paymentId } = await params

  try {
    // Get payment to verify it exists and belongs to this package
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        package: {
          include: {
            payments: true,
            client: {
              select: { organizationId: true }
            },
            _count: {
              select: {
                sessions: {
                  where: { cancelled: false }
                }
              }
            }
          }
        }
      }
    })

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    if (payment.packageId !== packageId) {
      return NextResponse.json(
        { error: 'Payment does not belong to this package' },
        { status: 400 }
      )
    }

    // Verify user has access to this organization
    if (payment.package.client.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Calculate what unlocked sessions would be after deletion
    const currentPaidAmount = payment.package.payments.reduce((sum, p) => sum + p.amount, 0)
    const newPaidAmount = currentPaidAmount - payment.amount
    const newUnlockedSessions = calculateUnlockedSessions(
      newPaidAmount,
      payment.package.totalValue,
      payment.package.totalSessions
    )

    const usedSessions = payment.package._count.sessions

    // Cannot delete if it would lock sessions that are already used
    if (usedSessions > newUnlockedSessions) {
      return NextResponse.json(
        {
          error: `Cannot delete payment. ${usedSessions} sessions have been used, but deleting this payment would only leave ${newUnlockedSessions} sessions unlocked. Please delete or cancel some sessions first.`
        },
        { status: 400 }
      )
    }

    // Delete the payment
    await prisma.payment.delete({
      where: { id: paymentId }
    })

    // Get updated summary
    const summary = await getPaymentSummary(packageId)

    return NextResponse.json({
      message: 'Payment deleted successfully',
      summary
    })
  } catch (error) {
    console.error('Error deleting payment:', error)
    return NextResponse.json(
      { error: 'Failed to delete payment' },
      { status: 500 }
    )
  }
}
