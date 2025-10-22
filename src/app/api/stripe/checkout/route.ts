import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { ensureStripeCustomer } from '@/lib/stripe-utils'

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
    
    // Get request body
    const body = await request.json()
    const { tier = 'SCALE' } = body
    
    // Validate tier
    if (!['GROWTH', 'SCALE'].includes(tier)) {
      return NextResponse.json(
        { error: 'Invalid subscription tier' },
        { status: 400 }
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
    
    // Only admins and managers can upgrade
    if (user.role !== 'ADMIN' && user.role !== 'PT_MANAGER') {
      return NextResponse.json(
        { error: 'Only administrators can manage billing' },
        { status: 403 }
      )
    }
    
    // Check if already on requested tier or higher
    const currentTier = user.organization.subscriptionTier
    if (currentTier === 'SCALE' || (currentTier === 'GROWTH' && tier === 'GROWTH')) {
      return NextResponse.json(
        { error: `Already subscribed to ${currentTier} plan` },
        { status: 400 }
      )
    }
    
    // Ensure organization has a Stripe customer
    const customerId = await ensureStripeCustomer(user.organizationId)
    
    // Get the price ID based on tier
    const priceId = tier === 'GROWTH' 
      ? process.env.STRIPE_GROWTH_PRICE_ID 
      : process.env.STRIPE_SCALE_PRICE_ID
      
    if (!priceId) {
      console.error(`STRIPE_${tier === 'GROWTH' ? 'GROWTH' : 'SCALE'}_PRICE_ID not configured`)
      return NextResponse.json(
        { error: 'Subscription price not configured' },
        { status: 500 }
      )
    }
    
    // Create checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings/billing?canceled=true`,
      metadata: {
        organizationId: user.organizationId,
        userId: user.id,
        userEmail: user.email,
      },
      subscription_data: {
        metadata: {
          organizationId: user.organizationId,
        },
        // Set the statement descriptor for subscription invoices
        description: 'FitSync Professional Subscription',
        // Optional: Add trial period
        // trial_period_days: 14,
      },
      // Note: payment_intent_data is not used in subscription mode
      // Statement descriptor should be set at the product/price level in Stripe Dashboard
      // Customer can manage subscription in portal later
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      // Show organization name in checkout
      client_reference_id: user.organizationId,
      customer_update: {
        address: 'auto',
        name: 'auto',
      },
    })
    
    // Log the checkout attempt
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CHECKOUT_STARTED',
        entityType: 'Organization',
        entityId: user.organizationId,
        newValue: {
          sessionId: checkoutSession.id,
          priceId,
          timestamp: new Date().toISOString(),
        },
      },
    })
    
    return NextResponse.json({
      success: true,
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    })
  } catch (error: any) {
    console.error('Checkout session error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to create checkout session' 
      },
      { status: 500 }
    )
  }
}