import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { handleSubscriptionDowngrade } from '@/lib/handle-downgrade'
import Stripe from 'stripe'

// IMPORTANT: This must be a raw body endpoint

// Handle OPTIONS requests for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 200 })
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    console.error('No stripe-signature header')
    return NextResponse.json(
      { error: 'No signature header' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`)
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    )
  }

  console.log(`📨 Webhook received: ${event.type}`)

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error(`Error processing webhook: ${error.message}`)
    // Return 200 to acknowledge receipt even if processing failed
    // This prevents Stripe from retrying
    return NextResponse.json({ 
      received: true, 
      error: error.message 
    })
  }
}

// Handle successful checkout
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log('✅ Checkout completed:', session.id)
  
  const organizationId = session.metadata?.organizationId
  if (!organizationId) {
    console.error('No organizationId in checkout metadata')
    return
  }

  // Determine tier based on price ID from metadata or line items
  let tier: 'FREE' | 'GROWTH' | 'SCALE' = 'FREE'
  
  // Check metadata first (if passed from checkout)
  if (session.metadata?.tier) {
    tier = session.metadata.tier as 'FREE' | 'GROWTH' | 'SCALE'
  } else {
    // Otherwise, check the price ID
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id)
    const priceId = lineItems.data[0]?.price?.id
    
    if (priceId === process.env.STRIPE_GROWTH_PRICE_ID) {
      tier = 'GROWTH'
    } else if (priceId === process.env.STRIPE_SCALE_PRICE_ID) {
      tier = 'SCALE'
    }
  }

  console.log(`Setting tier to ${tier} for organization ${organizationId}`)

  // Update organization with subscription info
  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      stripeSubscriptionId: session.subscription as string,
      subscriptionTier: tier,
      subscriptionStatus: 'ACTIVE',
    },
  })

  // Log the upgrade
  await prisma.auditLog.create({
    data: {
      userId: session.metadata?.userId || null,
      action: 'SUBSCRIPTION_UPGRADED',
      entityType: 'Organization',
      entityId: organizationId,
      newValue: {
        subscriptionId: String(session.subscription),
        customerId: String(session.customer),
        amount: session.amount_total || 0,
        timestamp: new Date().toISOString(),
      },
    },
  })

  console.log(`Organization ${organizationId} upgraded to ${tier}`)
}

// Handle new subscription creation
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log('📝 Subscription created:', subscription.id)
  
  const customerId = subscription.customer as string
  const org = await prisma.organization.findFirst({
    where: { stripeCustomerId: customerId },
  })

  if (!org) {
    console.error(`No organization found for customer ${customerId}`)
    return
  }

  // Determine tier based on price ID
  let tier: 'FREE' | 'GROWTH' | 'SCALE' = 'FREE'
  const priceId = subscription.items.data[0]?.price.id
  
  if (priceId === process.env.STRIPE_GROWTH_PRICE_ID) {
    tier = 'GROWTH'
  } else if (priceId === process.env.STRIPE_SCALE_PRICE_ID) {
    tier = 'SCALE'
  }

  console.log(`Setting tier to ${tier} based on price ${priceId}`)

  await prisma.organization.update({
    where: { id: org.id },
    data: {
      stripeSubscriptionId: subscription.id,
      subscriptionTier: tier,
      subscriptionStatus: mapStripeStatus(subscription.status),
    },
  })
}

// Handle subscription updates
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('🔄 Subscription updated:', subscription.id)
  
  const org = await prisma.organization.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  })

  if (!org) {
    console.error(`No organization found for subscription ${subscription.id}`)
    return
  }

  const previousTier = org.subscriptionTier
  const status = mapStripeStatus(subscription.status)
  
  // Determine tier based on price ID
  let tier: 'FREE' | 'GROWTH' | 'SCALE' = 'FREE'
  
  // Only downgrade to FREE if subscription is actually canceled/deleted, not just scheduled to cancel
  if (subscription.status === 'canceled' || subscription.status === 'incomplete_expired') {
    tier = 'FREE'
  } else {
    // Keep current tier even if cancel_at_period_end is true (they still have access)
    const priceId = subscription.items.data[0]?.price.id
    if (priceId === process.env.STRIPE_GROWTH_PRICE_ID) {
      tier = 'GROWTH'
    } else if (priceId === process.env.STRIPE_SCALE_PRICE_ID) {
      tier = 'SCALE'
    }
  }
  
  await prisma.organization.update({
    where: { id: org.id },
    data: {
      subscriptionStatus: status,
      subscriptionTier: tier,
    },
  })

  console.log(`Organization ${org.id} subscription status: ${status}, tier: ${tier}`)
  
  // Handle downgrade if tier decreased
  if (previousTier !== tier && tierLevel(tier) < tierLevel(previousTier)) {
    console.log(`Downgrade detected: ${previousTier} → ${tier}`)
    await handleSubscriptionDowngrade(org.id, previousTier, tier)
  }
}

// Helper function to determine tier level for comparison
function tierLevel(tier: string): number {
  switch (tier) {
    case 'SCALE': return 3
    case 'GROWTH': return 2
    case 'FREE': return 1
    default: return 0
  }
}

// Handle subscription cancellation
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('❌ Subscription deleted:', subscription.id)
  
  const org = await prisma.organization.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  })

  if (!org) {
    console.error(`No organization found for subscription ${subscription.id}`)
    return
  }

  const previousTier = org.subscriptionTier

  await prisma.organization.update({
    where: { id: org.id },
    data: {
      subscriptionTier: 'FREE',
      subscriptionStatus: 'ACTIVE', // They can still use free tier
      stripeSubscriptionId: null,
    },
  })
  
  // Handle downgrade to FREE
  if (previousTier !== 'FREE') {
    console.log(`Downgrade on deletion: ${previousTier} → FREE`)
    await handleSubscriptionDowngrade(org.id, previousTier, 'FREE')
  }

  // Log the downgrade
  await prisma.auditLog.create({
    data: {
      action: 'SUBSCRIPTION_CANCELLED',
      entityType: 'Organization',
      entityId: org.id,
      newValue: {
        subscriptionId: subscription.id,
        cancelledAt: new Date().toISOString(),
      },
    },
  })

  console.log(`Organization ${org.id} downgraded to FREE`)
}

// Handle failed payment
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.log('💳 Payment failed for invoice:', invoice.id)
  
  const customerId = invoice.customer as string
  const org = await prisma.organization.findFirst({
    where: { stripeCustomerId: customerId },
  })

  if (!org) {
    console.error(`No organization found for customer ${customerId}`)
    return
  }

  await prisma.organization.update({
    where: { id: org.id },
    data: {
      subscriptionStatus: 'PAST_DUE',
    },
  })

  console.log(`Organization ${org.id} marked as PAST_DUE`)
}

// Handle successful payment
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('💰 Payment succeeded for invoice:', invoice.id)
  
  // If this is a subscription invoice, update the status to active
  // Check if subscription exists on the invoice (it's an optional field)
  if ('subscription' in invoice && invoice.subscription) {
    const subscriptionId = typeof invoice.subscription === 'string' 
      ? invoice.subscription 
      : (invoice.subscription as any).id
      
    const org = await prisma.organization.findFirst({
      where: { stripeSubscriptionId: subscriptionId },
    })

    if (org && org.subscriptionStatus === 'PAST_DUE') {
      await prisma.organization.update({
        where: { id: org.id },
        data: {
          subscriptionStatus: 'ACTIVE',
        },
      })
      console.log(`Organization ${org.id} payment recovered, marked as ACTIVE`)
    }
  }
}

// Map Stripe status to our enum
function mapStripeStatus(stripeStatus: Stripe.Subscription.Status): 'ACTIVE' | 'CANCELED' | 'PAST_DUE' {
  switch (stripeStatus) {
    case 'active':
    case 'trialing':
      return 'ACTIVE'
    case 'past_due':
      return 'PAST_DUE'
    case 'canceled':
    case 'unpaid':
    case 'incomplete':
    case 'incomplete_expired':
      return 'CANCELED'
    default:
      return 'ACTIVE'
  }
}