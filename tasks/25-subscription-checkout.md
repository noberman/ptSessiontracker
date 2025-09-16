# Task 25: Subscription Checkout Flow

**Complexity: 4/10**  
**Priority: CRITICAL (SaaS Revenue)**  
**Status: Not Started**  
**Dependencies: Task 24 (Customer Creation)**  
**Estimated Time: 3 hours**

## Objective
Implement Stripe Checkout for upgrading from Free to Pro tier.

## Implementation Checklist

### Create Checkout Session API
- [ ] Create `/src/app/api/stripe/checkout/route.ts`:
```typescript
export async function POST(req: Request) {
  const orgId = await getOrganizationId()
  const org = await prisma.organization.findUnique({
    where: { id: orgId }
  })
  
  if (!org?.stripeCustomerId) {
    // Create customer if doesn't exist
    const customerId = await createStripeCustomer(...)
    // Update org
  }
  
  const session = await stripe.checkout.sessions.create({
    customer: org.stripeCustomerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{
      price: process.env.STRIPE_PRO_PRICE_ID,
      quantity: 1
    }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?canceled=true`,
    metadata: {
      organizationId: org.id
    }
  })
  
  return Response.json({ sessionId: session.id })
}
```

### Create Upgrade Button Component
- [ ] Create `/src/components/billing/UpgradeButton.tsx`:
```typescript
export function UpgradeButton() {
  const [loading, setLoading] = useState(false)
  
  const handleUpgrade = async () => {
    setLoading(true)
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST'
    })
    const { sessionId } = await res.json()
    
    const stripe = await getStripe()
    await stripe.redirectToCheckout({ sessionId })
  }
  
  return (
    <Button onClick={handleUpgrade} disabled={loading}>
      {loading ? 'Loading...' : 'Upgrade to Pro'}
    </Button>
  )
}
```

### Add Upgrade Prompts
- [ ] At usage limits:
```typescript
if (sessionCount >= 50 && tier === 'FREE') {
  return <UpgradePrompt message="You've reached the free tier limit" />
}
```

- [ ] In settings:
```typescript
<Card>
  <CardHeader>Current Plan: Free</CardHeader>
  <CardContent>
    <p>2 trainers, 50 sessions/month</p>
    <UpgradeButton />
  </CardContent>
</Card>
```

### Handle Success/Cancel
- [ ] Update `/src/app/(authenticated)/settings/billing/page.tsx`:
```typescript
export default function BillingPage({ searchParams }) {
  if (searchParams.success) {
    // Show success message
    // Subscription will be updated via webhook
  }
  
  if (searchParams.canceled) {
    // Show "checkout canceled" message
  }
}
```

### Create Subscription Management
- [ ] Show current subscription:
```typescript
const subscription = org.stripeSubscriptionId 
  ? await stripe.subscriptions.retrieve(org.stripeSubscriptionId)
  : null

// Display status, next billing date, amount
```

- [ ] Cancel subscription button:
```typescript
export async function POST(req: Request) {
  const subscription = await stripe.subscriptions.update(
    subscriptionId,
    { cancel_at_period_end: true }
  )
  return Response.json({ subscription })
}
```

### Add Trial Period (Optional)
- [ ] Modify checkout session:
```typescript
subscription_data: {
  trial_period_days: 14
}
```

### Billing Page UI
- [ ] Create comprehensive billing page:
  - [ ] Current plan details
  - [ ] Usage statistics
  - [ ] Next billing date
  - [ ] Payment method (via portal)
  - [ ] Invoice history
  - [ ] Upgrade/downgrade buttons

## Acceptance Criteria
- [ ] Can initiate checkout
- [ ] Redirects to Stripe Checkout
- [ ] Returns to success URL
- [ ] Shows current subscription
- [ ] Can cancel subscription
- [ ] Handles errors gracefully

## Testing
- [ ] Test upgrade flow
- [ ] Use Stripe test cards
- [ ] Verify success redirect
- [ ] Test cancel redirect
- [ ] Check subscription created in Stripe

## Test Card Numbers
```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
Requires auth: 4000 0025 0000 3155
```

## Notes
- Subscription status updated via webhook (Task 26)
- Don't update tier immediately
- Let webhook handle the source of truth
- Include trial period if desired