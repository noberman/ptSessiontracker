# Task 30: Billing Management Page

**Complexity: 3/10**  
**Priority: HIGH (Revenue Critical)**  
**Status: ✅ COMPLETED**  
**Dependencies: Task 25 (Checkout), Task 26 (Webhooks)**  
**Estimated Time: 2 hours**

## Objective
Create comprehensive billing page showing subscription status, usage, and payment management.

## Implementation Checklist

### Billing Page Layout
- [x] Create `/src/app/(authenticated)/settings/billing/page.tsx`:
```typescript
export default async function BillingPage() {
  const org = await getCurrentOrganization()
  const subscription = org.stripeSubscriptionId 
    ? await getSubscription(org.stripeSubscriptionId)
    : null
    
  return (
    <div>
      <CurrentPlan subscription={subscription} />
      <UsageMetrics organization={org} />
      <PaymentMethod customerId={org.stripeCustomerId} />
      <BillingHistory customerId={org.stripeCustomerId} />
      <UpgradeDowngrade tier={org.subscriptionTier} />
    </div>
  )
}
```

### Current Plan Component
- [x] Create `/src/components/billing/CurrentPlan.tsx`:
```typescript
function CurrentPlan({ subscription }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Current Plan</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div>Plan: {subscription ? 'Pro' : 'Free'}</div>
          <div>Status: {subscription?.status || 'Active'}</div>
          {subscription && (
            <>
              <div>Next billing: {formatDate(subscription.current_period_end)}</div>
              <div>Amount: ${subscription.plan.amount / 100}/month</div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
```

### Usage Metrics Component
- [x] Create `/src/components/billing/UsageMetrics.tsx`:
```typescript
function UsageMetrics({ organization }) {
  const metrics = await getUsageMetrics(organization.id)
  const limits = SUBSCRIPTION_TIERS[organization.subscriptionTier].limits
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Usage This Month</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <UsageBar
            label="Trainers"
            current={metrics.trainers}
            limit={limits.trainers}
          />
          <UsageBar
            label="Sessions"
            current={metrics.sessions}
            limit={limits.sessionsPerMonth}
          />
          <UsageBar
            label="Locations"
            current={metrics.locations}
            limit={limits.locations}
          />
        </div>
      </CardContent>
    </Card>
  )
}
```

### Payment Method Component
- [x] Create `/src/components/billing/PaymentMethod.tsx`:
```typescript
function PaymentMethod({ customerId }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Method</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={() => redirectToPortal(customerId)}>
          Manage Payment Methods
        </Button>
      </CardContent>
    </Card>
  )
}
```

### Billing History Component
- [ ] Create `/src/components/billing/BillingHistory.tsx`:
```typescript
function BillingHistory({ customerId }) {
  const invoices = await getInvoices(customerId)
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing History</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Invoice</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map(invoice => (
              <TableRow key={invoice.id}>
                <TableCell>{formatDate(invoice.created)}</TableCell>
                <TableCell>${invoice.amount_paid / 100}</TableCell>
                <TableCell>{invoice.status}</TableCell>
                <TableCell>
                  <a href={invoice.invoice_pdf}>Download</a>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
```

### Upgrade/Downgrade Component
- [ ] Create `/src/components/billing/PlanSelector.tsx`:
```typescript
function PlanSelector({ currentTier }) {
  if (currentTier === 'FREE') {
    return <UpgradeCard />
  }
  
  return (
    <div>
      <CancelSubscriptionButton />
      <PauseSubscriptionButton />
    </div>
  )
}
```

### Portal Redirect Function
- [ ] Create portal session:
```typescript
async function redirectToPortal(customerId: string) {
  const res = await fetch('/api/stripe/portal', {
    method: 'POST'
  })
  const { url } = await res.json()
  window.location.href = url
}
```

### Get Invoices Function
- [ ] Fetch from Stripe:
```typescript
async function getInvoices(customerId: string) {
  const invoices = await stripe.invoices.list({
    customer: customerId,
    limit: 10
  })
  return invoices.data
}
```

### Cancel Subscription Flow
- [ ] Confirmation dialog
- [ ] Reason selection
- [ ] Cancel at period end
- [ ] Immediate vs end of period

## Acceptance Criteria
- [ ] Shows current plan details
- [ ] Shows usage metrics
- [ ] Can access Stripe portal
- [ ] Shows billing history
- [ ] Can upgrade from Free
- [ ] Can cancel Pro subscription
- [ ] Invoices downloadable

## Testing
- [ ] View as Free user
- [ ] View as Pro user
- [ ] Test upgrade flow
- [ ] Test portal redirect
- [ ] View billing history
- [ ] Test cancel flow

## UI Components Needed
- Usage progress bars
- Status badges
- Invoice table
- Upgrade CTA card
- Cancel confirmation modal

## Notes
- Cache Stripe data appropriately
- Handle loading states
- Show clear upgrade benefits
- Make cancellation findable but not prominent