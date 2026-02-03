import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createBillingPortalSession, ensureStripeCustomer } from '@/lib/stripe-utils'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Get organization
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { organization: true },
    })
    
    if (!user?.organizationId || !user.organization) {
      return NextResponse.json(
        { error: 'No organization found' },
        { status: 400 }
      )
    }
    
    // Only admins and managers can access billing
    if (user.role !== 'ADMIN' && user.role !== 'PT_MANAGER') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }
    
    // Ensure organization has a Stripe customer
    const customerId = await ensureStripeCustomer(user.organizationId)
    
    // Create portal session
    const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings/billing`
    const portalUrl = await createBillingPortalSession(customerId, returnUrl)
    
    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'STRIPE_PORTAL_ACCESS',
        entityType: 'Organization',
        entityId: user.organizationId,
        newValue: {
          customerId,
          timestamp: new Date().toISOString(),
        },
      },
    })
    
    // Return the portal URL for client-side redirect
    return NextResponse.json({
      success: true,
      url: portalUrl
    })
  } catch (error: unknown) {
    console.error('Portal session error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create portal session'
      },
      { status: 500 }
    )
  }
}