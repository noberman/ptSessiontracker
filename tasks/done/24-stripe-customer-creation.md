# Task 24: Stripe Customer Creation

**Complexity: 3/10**  
**Priority: CRITICAL (SaaS Revenue)**  
**Status: ✅ COMPLETED**  
**Dependencies: Task 23 (Stripe Setup), Task 14 (Onboarding)**  
**Estimated Time: 2 hours**

## Objective
Automatically create Stripe customer when organization signs up and store customer ID.

## Implementation Checklist

### Update Organization Creation
- [x] Modify organization creation in onboarding:
```typescript
// In signup/organization creation API
const organization = await prisma.organization.create({
  data: {
    name,
    email,
    // ... other fields
  }
})

// Create Stripe customer
const customerId = await createStripeCustomer(
  email,
  name,
  organization.id
)

// Update organization with Stripe ID
await prisma.organization.update({
  where: { id: organization.id },
  data: { stripeCustomerId: customerId }
})
```

### Create Customer Management Functions
- [x] Update `/src/lib/stripe-utils.ts`:
```typescript
export async function createStripeCustomer(
  email: string,
  name: string,
  organizationId: string
): Promise<string> {
  try {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        organizationId,
        environment: process.env.NODE_ENV
      }
    })
    return customer.id
  } catch (error) {
    console.error('Failed to create Stripe customer:', error)
    throw error
  }
}

export async function updateStripeCustomer(
  customerId: string,
  updates: Stripe.CustomerUpdateParams
) {
  return await stripe.customers.update(customerId, updates)
}

export async function getStripeCustomer(customerId: string) {
  return await stripe.customers.retrieve(customerId)
}
```

### Handle Existing Organizations
- [x] Create migration script for Wood Square:
```typescript
// /scripts/create-stripe-customers.ts
async function createStripeCustomersForExisting() {
  const orgs = await prisma.organization.findMany({
    where: { stripeCustomerId: null }
  })
  
  for (const org of orgs) {
    const customerId = await createStripeCustomer(
      org.email,
      org.name,
      org.id
    )
    
    await prisma.organization.update({
      where: { id: org.id },
      data: { stripeCustomerId: customerId }
    })
  }
}
```

### Update Organization Settings
- [x] Add ability to update billing email:
```typescript
// When org updates email
if (emailChanged && organization.stripeCustomerId) {
  await updateStripeCustomer(organization.stripeCustomerId, {
    email: newEmail
  })
}
```

### Error Handling
- [x] Handle Stripe API failures gracefully:
  - [x] Log errors but don't block signup
  - [x] Set up retry mechanism
  - [x] Alert admin of failures
  - [x] Allow manual customer creation

### Add Customer Portal Access
- [x] Create `/api/stripe/portal` endpoint:
```typescript
export async function POST(req: Request) {
  const orgId = await getOrganizationId()
  const org = await prisma.organization.findUnique({
    where: { id: orgId }
  })
  
  if (!org?.stripeCustomerId) {
    return Response.json({ error: 'No customer' }, { status: 400 })
  }
  
  const session = await stripe.billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`
  })
  
  return Response.json({ url: session.url })
}
```

## Acceptance Criteria
- [x] New orgs get Stripe customer ID
- [x] Customer created with correct metadata
- [x] Existing orgs migrated
- [x] Can update customer info
- [x] Portal link works
- [x] Errors handled gracefully

## Testing
- [x] Sign up new organization
- [x] Verify customer in Stripe dashboard
- [x] Check metadata is correct
- [x] Test portal access
- [x] Test error scenarios

## Notes
- Use test mode initially
- Customer creation is free
- Don't create subscription yet
- Keep customer and subscription separate