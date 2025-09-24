# Task 31: Usage Limits Enforcement

**Complexity: 4/10**  
**Priority: HIGH (Free Tier Control)**  
**Status: Not Started**  
**Dependencies: Task 30 (Billing Page)**  
**Estimated Time: 3 hours**

## Objective
Implement and enforce usage limits for Free tier organizations.

## Implementation Checklist

### Define Limits Configuration
- [ ] Update `/src/config/subscriptions.ts`:
```typescript
export const TIER_LIMITS = {
  FREE: {
    trainers: 2,
    sessionsPerMonth: 50,
    locations: 1,
    clientsPerTrainer: 20,
    dataRetentionDays: 90
  },
  PRO: {
    trainers: -1, // unlimited
    sessionsPerMonth: -1,
    locations: -1,
    clientsPerTrainer: -1,
    dataRetentionDays: -1
  }
}
```

### Create Usage Tracking Service
- [ ] Create `/src/lib/usage-limits.ts`:
```typescript
export async function checkTrainerLimit(organizationId: string): Promise<boolean> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId }
  })
  
  if (org?.subscriptionTier === 'PRO') return true
  
  const trainerCount = await prisma.user.count({
    where: {
      organizationId,
      role: 'TRAINER'
    }
  })
  
  return trainerCount < TIER_LIMITS.FREE.trainers
}

export async function checkSessionLimit(organizationId: string): Promise<boolean> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId }
  })
  
  if (org?.subscriptionTier === 'PRO') return true
  
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)
  
  const sessionCount = await prisma.session.count({
    where: {
      trainer: { organizationId },
      createdAt: { gte: startOfMonth }
    }
  })
  
  return sessionCount < TIER_LIMITS.FREE.sessionsPerMonth
}

export async function getUsageMetrics(organizationId: string) {
  const [trainers, sessions, locations] = await Promise.all([
    prisma.user.count({
      where: { organizationId, role: 'TRAINER' }
    }),
    prisma.session.count({
      where: {
        trainer: { organizationId },
        createdAt: { gte: startOfMonth() }
      }
    }),
    prisma.location.count({
      where: { organizationId }
    })
  ])
  
  return { trainers, sessions, locations }
}
```

### Enforce Limits in APIs

#### User Creation
- [ ] Update `/src/app/api/users/route.ts`:
```typescript
export async function POST(req: Request) {
  const orgId = await getOrganizationId()
  
  // Check trainer limit
  if (data.role === 'TRAINER') {
    const canAdd = await checkTrainerLimit(orgId)
    if (!canAdd) {
      return Response.json(
        { 
          error: 'Trainer limit reached',
          upgradeRequired: true,
          limit: TIER_LIMITS.FREE.trainers
        },
        { status: 403 }
      )
    }
  }
  
  // Continue with creation...
}
```

#### Session Creation
- [ ] Update `/src/app/api/sessions/route.ts`:
```typescript
export async function POST(req: Request) {
  const orgId = await getOrganizationId()
  
  // Check session limit
  const canCreate = await checkSessionLimit(orgId)
  if (!canCreate) {
    return Response.json(
      {
        error: 'Monthly session limit reached',
        upgradeRequired: true,
        limit: TIER_LIMITS.FREE.sessionsPerMonth
      },
      { status: 403 }
    )
  }
  
  // Continue with creation...
}
```

#### Location Creation
- [ ] Update `/src/app/api/locations/route.ts`:
```typescript
// Similar limit check for locations
```

### Create Limit Warning Components
- [ ] Create `/src/components/limits/LimitWarning.tsx`:
```typescript
function LimitWarning({ current, limit, type }) {
  const percentage = (current / limit) * 100
  
  if (percentage < 80) return null
  
  return (
    <Alert className={percentage >= 100 ? 'border-red-500' : 'border-yellow-500'}>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>
        {percentage >= 100 ? 'Limit Reached' : 'Approaching Limit'}
      </AlertTitle>
      <AlertDescription>
        You've used {current} of {limit} {type} this month.
        <Link href="/settings/billing">Upgrade to Pro</Link>
      </AlertDescription>
    </Alert>
  )
}
```

### Add Limit Displays
- [ ] Show limits in UI:
```typescript
// In trainer list page
<div className="mb-4">
  <span>Trainers: {trainers.length} / {limit}</span>
  {nearLimit && <UpgradePrompt />}
</div>

// In session creation
{!canCreate && (
  <div className="p-4 bg-red-50 rounded">
    <p>You've reached your monthly session limit.</p>
    <Button onClick={upgrade}>Upgrade to Pro</Button>
  </div>
)}
```

### Create Usage Dashboard Widget
- [ ] Create `/src/components/dashboard/UsageWidget.tsx`:
```typescript
function UsageWidget() {
  const usage = await getUsageMetrics(orgId)
  const limits = TIER_LIMITS[tier]
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Usage This Month</CardTitle>
      </CardHeader>
      <CardContent>
        <UsageBar label="Trainers" current={usage.trainers} limit={limits.trainers} />
        <UsageBar label="Sessions" current={usage.sessions} limit={limits.sessionsPerMonth} />
        <UsageBar label="Locations" current={usage.locations} limit={limits.locations} />
        {tier === 'FREE' && (
          <Button className="mt-4 w-full" onClick={upgrade}>
            Upgrade for Unlimited
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
```

### Add Soft Warnings
- [ ] Show warnings at 80% usage
- [ ] Show hard stops at 100%
- [ ] Email notifications at thresholds

### Create Admin Override
- [ ] Allow temporary limit increases:
```typescript
// In organization settings (admin only)
temporaryLimitOverride?: {
  trainers?: number
  sessions?: number
  expiresAt: DateTime
}
```

## Acceptance Criteria
- [ ] Cannot exceed trainer limit
- [ ] Cannot exceed session limit
- [ ] Cannot exceed location limit
- [ ] Warnings show at 80%
- [ ] Clear upgrade prompts
- [ ] Usage metrics accurate
- [ ] Limits reset monthly

## Testing
- [ ] Create trainers up to limit
- [ ] Try exceeding trainer limit
- [ ] Create sessions up to limit
- [ ] Try exceeding session limit
- [ ] Verify monthly reset
- [ ] Test Pro tier (no limits)

## Error Messages
- "You've reached the maximum number of trainers for the Free plan"
- "Upgrade to Pro for unlimited trainers"
- "Monthly session limit reached (50/50)"
- "You need Pro to add more locations"

## Notes
- Be graceful with limits
- Always offer upgrade path
- Consider grace period
- Log limit hits for analytics