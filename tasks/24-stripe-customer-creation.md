# Task 24: Stripe Customer Creation

**Complexity: 3/10**  
**Priority: CRITICAL (SaaS Revenue)**  
**Status: Not Started**  
**Dependencies: Task 23 (Stripe Setup), Task 14 (Onboarding)**  
**Estimated Time: 2 hours**

## Objective
Automatically create Stripe customer when organization signs up and store customer ID.

## Implementation Checklist

### Update Organization Creation
- [ ] Modify organization creation in onboarding:
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
- [ ] Update `/src/lib/stripe-utils.ts`:
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
- [ ] Create migration script for Wood Square:
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
- [ ] Add ability to update billing email:
```typescript
// When org updates email
if (emailChanged && organization.stripeCustomerId) {
  await updateStripeCustomer(organization.stripeCustomerId, {
    email: newEmail
  })
}
```

### Error Handling
- [ ] Handle Stripe API failures gracefully:
  - [ ] Log errors but don't block signup
  - [ ] Set up retry mechanism
  - [ ] Alert admin of failures
  - [ ] Allow manual customer creation

### Add Customer Portal Access
- [ ] Create `/api/stripe/portal` endpoint:
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
- [ ] New orgs get Stripe customer ID
- [ ] Customer created with correct metadata
- [ ] Existing orgs migrated
- [ ] Can update customer info
- [ ] Portal link works
- [ ] Errors handled gracefully

## Testing
- [ ] Sign up new organization
- [ ] Verify customer in Stripe dashboard
- [ ] Check metadata is correct
- [ ] Test portal access
- [ ] Test error scenarios

## Notes
- Use test mode initially
- Customer creation is free
- Don't create subscription yet
- Keep customer and subscription separate