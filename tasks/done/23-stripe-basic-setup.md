# Task 23: Basic Stripe Setup

**Complexity: 2/10**  
**Priority: CRITICAL (SaaS Revenue)**  
**Status: ✅ COMPLETED**  
**Dependencies: None**  
**Estimated Time: 1 hour**

## Objective
Install and configure Stripe SDK with products and prices for subscription tiers.

## Implementation Checklist

### Install Dependencies
- [x] Run `npm install stripe @stripe/stripe-js`
- [x] Run `npm install --save-dev @types/stripe`

### Environment Variables
- [x] Add to `.env.local`:
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
```

### Create Stripe Products (in Stripe Dashboard)
- [x] CRITICAL: Configure Statement Descriptor (Settings → Business → Public details)
  - [x] Set to "FITSYNC" not "FLOWBIT" 
  - [x] This is what appears on customer credit card statements
- [x] Create "FitSync Pro" product
- [x] Create recurring price: $15/month
- [x] Note the price ID
- [x] Set up test mode first

### Initialize Stripe Client
- [x] Create `/src/lib/stripe.ts`:
```typescript
import Stripe from 'stripe'

export const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY!, 
  {
    apiVersion: '2024-11-20.acacia',
    typescript: true
  }
)

// For client-side
export const getStripe = () => {
  return loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
}
```

### Create Subscription Plans Config
- [x] Create `/src/config/subscriptions.ts`:
```typescript
export const SUBSCRIPTION_TIERS = {
  FREE: {
    name: 'Free',
    price: 0,
    limits: {
      trainers: 2,
      sessionsPerMonth: 50,
      locations: 1
    },
    features: [
      'Up to 2 trainers',
      '50 sessions/month',
      'Basic reports',
      'Email support'
    ]
  },
  PRO: {
    name: 'Pro',
    price: 15,
    priceId: process.env.STRIPE_PRO_PRICE_ID,
    limits: {
      trainers: -1, // unlimited
      sessionsPerMonth: -1,
      locations: -1
    },
    features: [
      'Unlimited trainers',
      'Unlimited sessions',
      'Unlimited locations',
      'Advanced reports',
      'Priority support',
      'Custom branding (coming soon)'
    ]
  }
}
```

### Create Stripe Utilities
- [x] Create `/src/lib/stripe-utils.ts`:
```typescript
export async function createStripeCustomer(
  email: string,
  name: string,
  organizationId: string
) {
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: {
      organizationId
    }
  })
  return customer.id
}
```

### Test Connection
- [x] Create test API route `/api/stripe/test`:
```typescript
export async function GET() {
  try {
    const products = await stripe.products.list({ limit: 1 })
    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
```

## Acceptance Criteria
- [x] Stripe SDK installed
- [x] Environment variables configured
- [x] Products created in Stripe
- [x] Can connect to Stripe API
- [x] Test route confirms connection

## Testing
- [x] Verify Stripe connection
- [x] Check product exists in Stripe
- [x] Verify price ID is correct
- [x] Test with Stripe test keys

## Security Notes
- Never commit API keys
- Use environment variables
- Validate webhook signatures
- Use test mode for development

## Next Steps
- Task 24 will handle customer creation
- Task 25 will implement checkout
- Task 26 will handle webhooks