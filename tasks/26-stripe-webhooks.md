# Task 26: Stripe Webhook Handler

**Complexity: 4/10**  
**Priority: CRITICAL (SaaS Revenue)**  
**Status: Not Started**  
**Dependencies: Task 25 (Checkout)**  
**Estimated Time: 2 hours**

## Objective
Handle Stripe webhooks to keep subscription status synchronized.

## Implementation Checklist

### Create Webhook Endpoint
- [ ] Create `/src/app/api/stripe/webhook/route.ts`:
```typescript
import { headers } from 'next/headers'

export async function POST(req: Request) {
  const body = await req.text()
  const signature = headers().get('stripe-signature')!
  
  let event: Stripe.Event
  
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    return Response.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }
  
  // Handle events
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object)
      break
    case 'customer.subscription.created':
      await handleSubscriptionCreated(event.data.object)
      break
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object)
      break
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object)
      break
    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object)
      break
  }
  
  return Response.json({ received: true })
}
```

### Event Handlers
- [ ] Checkout completed:
```typescript
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const orgId = session.metadata?.organizationId
  if (!orgId) return
  
  await prisma.organization.update({
    where: { id: orgId },
    data: {
      stripeSubscriptionId: session.subscription as string,
      subscriptionTier: 'PRO',
      subscriptionStatus: 'ACTIVE'
    }
  })
  
  // Send welcome email
  await sendProWelcomeEmail(orgId)
}
```

- [ ] Subscription updated:
```typescript
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const org = await prisma.organization.findFirst({
    where: { stripeCustomerId: subscription.customer as string }
  })
  
  if (!org) return
  
  const status = mapStripeStatus(subscription.status)
  const tier = subscription.items.data.length > 0 ? 'PRO' : 'FREE'
  
  await prisma.organization.update({
    where: { id: org.id },
    data: {
      subscriptionStatus: status,
      subscriptionTier: tier
    }
  })
}
```

- [ ] Subscription deleted:
```typescript
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const org = await prisma.organization.findFirst({
    where: { stripeSubscriptionId: subscription.id }
  })
  
  if (!org) return
  
  await prisma.organization.update({
    where: { id: org.id },
    data: {
      subscriptionTier: 'FREE',
      subscriptionStatus: 'ACTIVE',
      stripeSubscriptionId: null
    }
  })
  
  // Send downgrade email
  await sendDowngradeEmail(org.id)
}
```

- [ ] Payment failed:
```typescript
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const org = await prisma.organization.findFirst({
    where: { stripeCustomerId: invoice.customer as string }
  })
  
  if (!org) return
  
  await prisma.organization.update({
    where: { id: org.id },
    data: { subscriptionStatus: 'PAST_DUE' }
  })
  
  // Send payment failed email
  await sendPaymentFailedEmail(org.id)
}
```

### Configure Webhook in Stripe
- [ ] Add endpoint URL in Stripe Dashboard:
  - Development: `https://[your-domain]/api/stripe/webhook`
  - Use ngrok for local testing
- [ ] Select events to listen for:
  - [ ] checkout.session.completed
  - [ ] customer.subscription.created
  - [ ] customer.subscription.updated
  - [ ] customer.subscription.deleted
  - [ ] invoice.payment_failed
  - [ ] invoice.payment_succeeded

### Add Webhook Secret
- [ ] Get webhook secret from Stripe
- [ ] Add to environment variables:
```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Create Status Mapping
- [ ] Map Stripe to app statuses:
```typescript
function mapStripeStatus(stripeStatus: string): SubscriptionStatus {
  switch (stripeStatus) {
    case 'active':
    case 'trialing':
      return 'ACTIVE'
    case 'past_due':
      return 'PAST_DUE'
    case 'canceled':
    case 'unpaid':
      return 'CANCELED'
    default:
      return 'ACTIVE'
  }
}
```

### Add Logging
- [ ] Log all webhook events:
```typescript
await prisma.webhookLog.create({
  data: {
    eventId: event.id,
    eventType: event.type,
    payload: JSON.stringify(event.data),
    processedAt: new Date()
  }
})
```

## Testing with Stripe CLI
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Trigger test events
stripe trigger checkout.session.completed
```

## Acceptance Criteria
- [ ] Webhook endpoint receives events
- [ ] Signature validation works
- [ ] Subscription status updates
- [ ] Organization tier updates
- [ ] Failed payments handled
- [ ] Events logged

## Security
- Always verify signature
- Use webhook secret
- Validate organization exists
- Handle duplicate events
- Log suspicious activity

## Notes
- Webhooks are critical for subscription accuracy
- Always use webhook data as source of truth
- Handle events idempotently
- Set up alerting for failures