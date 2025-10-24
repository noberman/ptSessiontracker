# Task 42: Graceful Degradation for Subscription Downgrades

## User Story
As an organization admin, when I downgrade my subscription tier (or my beta/trial expires), I need the system to gracefully handle existing data that exceeds my new plan limits without losing any historical information, so that I can continue operating with restrictions and easily upgrade when ready.

## Problem Statement
Currently, there's no handling for when organizations downgrade from Scale → Growth → Free tiers. This affects:
- Organizations with 10 trainers downgrading to Free (2 trainer limit)
- Organizations with multiple locations downgrading to single location
- Organizations exceeding monthly session limits
- Beta test participants reverting to Free tier after trial

## Success Criteria
- [ ] No data is ever deleted during downgrades
- [ ] Clear UI communication about what's restricted
- [ ] Existing trainers/locations can view but not create data
- [ ] Easy upgrade path is always visible
- [ ] Historical data remains intact and reportable
- [ ] Admin can choose which entities remain active (optional enhancement)

## Implementation Plan

### EXISTING INFRASTRUCTURE
We already have in `usage-limits.ts`:
- `canAddTrainer()` - Prevents adding trainers over limit ✅
- `canCreateSession()` - Prevents sessions over monthly limit ✅
- `canAddLocation()` - Prevents adding locations over limit ✅
- `getOrganizationUsage()` - Gets current usage statistics ✅

API enforcement already exists in:
- `/api/users/route.ts` - Blocks trainer creation ✅
- `/api/sessions/route.ts` - Blocks session creation ✅  
- `/api/locations/route.ts` - Blocks location creation ✅

**What we need to ADD:**
1. Handle EXISTING trainers/locations when over limit after downgrade
2. Allow deactivation of trainers/locations
3. Block deactivated trainers from logging sessions
4. UI to show over-limit warnings
5. Beta access override system

## Implementation Plan (Building on Existing)

### Phase 1: Database Schema Updates
**Priority: High | Complexity: 3/10**

```prisma
// Add suspension tracking to handle over-limit entities
model User {
  // existing fields...
  suspendedAt      DateTime?  @db.Timestamptz(3)
  suspendedReason  String?    // "TIER_DOWNGRADE", "BETA_EXPIRED", "LIMIT_EXCEEDED"
}

model Location {
  // existing fields...
  suspendedAt      DateTime?  @db.Timestamptz(3)
  suspendedReason  String?
}

model Organization {
  // For beta testing support
  betaAccess        Boolean   @default(false)
  betaExpiresAt     DateTime? @db.Timestamptz(3)
  betaPreviousTier  SubscriptionTier? // Store tier to revert to
}
```

### Phase 2: Enhance Existing Limit Checking
**Priority: High | Complexity: 3/10** (reduced since base exists)

Enhance `/src/lib/usage-limits.ts`:

#### 2.1 Core Types and Interfaces
```typescript
export interface OrganizationLimits {
  canAddTrainers: boolean
  canAddLocations: boolean
  canLogSessions: boolean
  canExportReports: boolean
  
  current: {
    trainers: number
    activeTrainers: number  // Not suspended
    locations: number
    activeLocations: number  // Not suspended
    sessionsThisMonth: number
  }
  
  limits: {
    trainers: number
    locations: number
    sessionsPerMonth: number
  }
  
  overages: {
    trainers: number  // How many over limit
    locations: number
  }
  
  warnings: string[]  // User-friendly warning messages
}
```

#### 2.2 Add Beta Override to Existing Functions
```typescript
// ADD to existing getOrganizationUsage function
export async function getOrganizationUsage(organizationId: string): Promise<UsageStats> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
  })
  
  // NEW: Check for beta access override
  const effectiveTier = (org.betaAccess && org.betaExpiresAt > new Date()) 
    ? 'SCALE' 
    : org.subscriptionTier
    
  const tier = SUBSCRIPTION_TIERS[effectiveTier] // Changed from org.subscriptionTier
  // ... rest stays same
}

// NEW FUNCTION: Check if specific trainer can log sessions
export async function canTrainerLogSessions(
  trainerId: string,
  organizationId: string
): Promise<{ allowed: boolean; reason?: string }> {
  // 1. Get organization with tier
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    include: {
      _count: {
        select: {
          users: { where: { role: 'TRAINER', deletedAt: null } },
          locations: { where: { deletedAt: null } },
        }
      }
    }
  })
  
  // 2. Check for beta access override
  const effectiveTier = isActiveBeta(org) ? 'SCALE' : org.subscriptionTier
  const limits = SUBSCRIPTION_TIERS[effectiveTier].limits
  
  // 3. Get active counts (not suspended)
  const activeTrainers = await prisma.user.count({
    where: { 
      organizationId: orgId,
      role: 'TRAINER',
      suspendedAt: null,
      deletedAt: null
    }
  })
  
  // 4. Get sessions this month
  const sessionsThisMonth = await getMonthlySessionCount(orgId)
  
  // 5. Build response
  return {
    canAddTrainers: activeTrainers < limits.trainers || limits.trainers === -1,
    canAddLocations: activeLocations < limits.locations || limits.locations === -1,
    canLogSessions: sessionsThisMonth < limits.sessionsPerMonth || limits.sessionsPerMonth === -1,
    // ... rest of response
  }
}
```

#### 2.3 Specific Check Functions
```typescript
// Check if a specific trainer can log sessions
export async function canTrainerLogSessions(
  trainerId: string,
  organizationId: string
): Promise<{ allowed: boolean; reason?: string }> {
  // Check if trainer is suspended
  const trainer = await prisma.user.findUnique({
    where: { id: trainerId },
    select: { suspendedAt: true, suspendedReason: true }
  })
  
  if (trainer?.suspendedAt) {
    return { 
      allowed: false, 
      reason: `Your account is inactive due to plan limits. Contact your admin.`
    }
  }
  
  // Check organization session limit
  const limits = await checkOrganizationLimits(organizationId)
  if (!limits.canLogSessions) {
    return {
      allowed: false,
      reason: `Monthly session limit reached (${limits.limits.sessionsPerMonth})`
    }
  }
  
  return { allowed: true }
}

// Check if location can be used for sessions
export async function canUseLocation(
  locationId: string,
  organizationId: string
): Promise<{ allowed: boolean; reason?: string }> {
  const location = await prisma.location.findUnique({
    where: { id: locationId },
    select: { suspendedAt: true, organizationId: true }
  })
  
  if (location?.suspendedAt) {
    return {
      allowed: false,
      reason: `This location is inactive due to plan limits.`
    }
  }
  
  return { allowed: true }
}
```

#### 2.4 Auto-Suspension Logic
```typescript
export async function applySuspensionsForDowngrade(
  organizationId: string,
  newTier: SubscriptionTier
): Promise<void> {
  const limits = SUBSCRIPTION_TIERS[newTier].limits
  
  // NOTE: We're NOT auto-suspending anymore per requirements
  // Admin must manually deactivate trainers/locations
  // This function now just sends notifications
  
  const org = await getOrganizationWithCounts(organizationId)
  
  if (org.trainerCount > limits.trainers && limits.trainers !== -1) {
    await createNotification({
      organizationId,
      type: 'LIMIT_EXCEEDED',
      message: `You have ${org.trainerCount} trainers but your plan allows ${limits.trainers}. Please deactivate ${org.trainerCount - limits.trainers} trainers.`
    })
  }
  
  if (org.locationCount > limits.locations && limits.locations !== -1) {
    await createNotification({
      organizationId,
      type: 'LIMIT_EXCEEDED', 
      message: `You have ${org.locationCount} locations but your plan allows ${limits.locations}. Please deactivate ${org.locationCount - limits.locations} locations.`
    })
  }
}
```

### Phase 3: API Enforcement
**Priority: High | Complexity: 5/10**

#### 3.1 Session Creation (`/api/sessions/route.ts`)
- Check if trainer is suspended
- Check if location is suspended  
- Check monthly session limit
- Return 403 with upgrade prompt if any check fails

#### 3.2 Trainer Addition (`/api/users/route.ts`)
- Already has canAddTrainer check
- Enhance error message with current/limit counts

#### 3.3 Location Operations (`/api/locations/route.ts`)
- Add suspension checks
- Prevent session logging at suspended locations

### Phase 4: Downgrade Handler
**Priority: High | Complexity: 6/10**

Create `/src/lib/handle-downgrade.ts`:
```typescript
export async function handleSubscriptionDowngrade(
  organizationId: string,
  fromTier: SubscriptionTier,
  toTier: SubscriptionTier
) {
  const limits = SUBSCRIPTION_TIERS[toTier].limits
  
  // 1. Get all trainers, locations
  // 2. Auto-suspend entities over limits (keep most recently active)
  // 3. Create audit log entries
  // 4. Send email notification to admin
  // 5. Create notification in app
}
```

### Phase 5: UI Components
**Priority: High | Complexity: 5/10**

#### 5.1 Warning Banners (`/src/components/subscription/LimitWarnings.tsx`)
```tsx
<OverLimitBanner 
  type="trainers"
  current={10}
  limit={2}
  suspended={8}
/>
// Shows: "8 trainers are inactive due to plan limits. Upgrade to reactivate."
```

#### 5.2 Entity Status Indicators
- Gray out suspended trainers in lists
- Add "(Inactive - Upgrade Required)" badges
- Disable action buttons with tooltips

#### 5.3 Dashboard Limit Widget (`/src/components/dashboard/UsageLimits.tsx`)
```tsx
<UsageLimitsCard>
  - Trainers: 10/2 (8 inactive)
  - Locations: 3/1 (2 inactive)  
  - Sessions This Month: 45/50
  - [Upgrade Now] button
</UsageLimitsCard>
```

### Phase 6: Beta Test Support
**Priority: Medium | Complexity: 4/10**

#### 6.1 Beta Access Management (`/api/admin/beta-access/route.ts`)
- Grant beta access with expiry date
- Schedule automatic reversion
- Track original tier

#### 6.2 Beta Expiry Handler
```typescript
// Run daily via cron
export async function checkBetaExpiry() {
  const expired = await prisma.organization.findMany({
    where: {
      betaAccess: true,
      betaExpiresAt: { lte: new Date() }
    }
  })
  
  for (const org of expired) {
    await handleDowngrade(org.id, 'SCALE', org.betaPreviousTier || 'FREE')
    await prisma.organization.update({
      where: { id: org.id },
      data: { 
        betaAccess: false,
        subscriptionTier: org.betaPreviousTier || 'FREE'
      }
    })
  }
}
```

### Phase 7: Admin Manual Compliance
**Priority: High | Complexity: 3/10**

Since we're NOT auto-suspending, admins need clear UI to:
1. See they're over limits
2. Manually deactivate trainers/locations
3. Understand consequences

Update existing user/location management pages:
- Show limit status prominently: "3/2 trainers active (1 over limit)"
- Disable "Add" buttons when at/over limit
- Add warning when deactivating: "This trainer has X sessions this month"

## Testing Requirements

### Test Scenarios:
1. **Scale → Free downgrade**
   - 20 trainers → 2 trainer limit
   - 5 locations → 1 location limit
   - Verify 18 trainers suspended, 4 locations suspended

2. **Session limit exceeded**
   - Log 50 sessions on Free tier
   - Attempt 51st session → blocked with upgrade prompt

3. **Beta expiry**
   - Grant 30-day beta access
   - Fast-forward to day 31
   - Verify reversion to original tier

4. **Upgrade after downgrade**
   - Downgrade with suspensions
   - Upgrade back
   - Verify all entities reactivated

## Migration Strategy

1. **Deploy schema changes** (no impact on existing)
2. **Deploy limit checking** (log-only mode first)
3. **Enable enforcement** (with feature flag)
4. **Monitor for issues** (7 days)
5. **Remove feature flag** (fully enabled)

## Rollback Plan

- Feature flag to disable enforcement
- All checks have bypass for ADMIN role during emergency
- No data modifications that can't be reversed

## Dependencies

- Stripe webhook handling (already implemented)
- Current tier tracking (already implemented)
- Usage limits library (partially implemented, needs enhancement)

## Estimated Timeline

- Phase 1-3: 2 days (Core enforcement)
- Phase 4-5: 2 days (Handlers and UI)
- Phase 6: 1 day (Beta support)
- Phase 7: 0.5 day (Manual compliance UI)
- Testing: 2 days

**Total: 5-6 days for full implementation**

## Notes

- This is critical for beta launch to prevent confusion
- Must be implemented before any production downgrades occur
- Consider A/B testing auto-suspend vs manual selection
- Monitor customer support tickets after launch