# Task 47: Enhanced Dashboard Client Metrics

## Problem Statement

The current dashboard shows basic client counts that don't provide meaningful business insights. The "Active Clients" metric is based on a simple boolean flag on the Client model, not derived from actual package status. This doesn't reflect the true state of client engagement.

Managers and admins need visibility into:
- How many clients have active packages vs. completed/expired
- Client acquisition (new clients)
- Client retention (resold clients)
- Client churn (lost clients)
- At-risk clients (expiring packages)

## Current State

### Dashboard API (`/api/dashboard/route.ts`)
- `activeClients`: Count of clients where `client.active = true`
- This boolean is manually set, NOT derived from package status
- No metrics for new, resold, lost, or at-risk clients

### Package Status (Current Understanding)
- **Active Package**: `remainingSessions > 0` AND (`expiresAt` is null OR `expiresAt > now`)
- **Completed Package**: `remainingSessions = 0`
- **Expired Package**: `expiresAt < now`

### Client "Active" Status - CURRENT (To Be Changed)
- Currently a manual boolean flag on Client model
- NOT related to package status
- **Decision**: This should be DERIVED from package status, not manually set

---

## Client State Model

Clients should be tagged/categorized based on their package and session status. These states are **derived**, not manually set.

### Client States

| State | Definition | Business Meaning |
|-------|------------|------------------|
| **Active** | Has at least one active package (remainingSessions > 0, not expired) | Currently engaged client |
| **Not Started** | Has active package(s) but zero sessions against ANY active package | Sold but hasn't begun training |
| **At-Risk** | Has active package expiring within 14 days with sessions remaining | Needs renewal outreach |
| **Lost** | Has had packages before, but none are currently active | Churned client |

**State Relationships:**
- **Not Started** is a SUBSET of **Active** - they have an active package, just haven't used it
- **At-Risk** is a SUBSET of **Active** - they have an active package that's expiring soon
- A client can be **Active + At-Risk** (expiring soon but still has sessions)
- A client can be **Active + Not Started + At-Risk** (bought package, hasn't used it, and it's expiring)
- **Lost** is MUTUALLY EXCLUSIVE with Active (if you're lost, you have no active packages)

### Dashboard Display Approach
Rather than showing one "primary" state, show counts for each:
- **Active**: X clients (includes Not Started and At-Risk subsets)
- **Not Started**: Y clients (subset of Active needing onboarding)
- **At-Risk**: Z clients (subset of Active needing renewal outreach)
- **Lost**: W clients (no active package, need win-back)

This way managers see the full picture without states being mutually exclusive.

---

## Proposed Metrics

The dashboard should show **both snapshot metrics** (current state) **and period-based metrics** (changes within time filter).

### Snapshot Metrics (Current State)
These show the current state regardless of time filter.

#### Total Clients
**Definition**: All client profiles in the organization (respecting location filters)
**Calculation**: `COUNT(clients WHERE organizationId = :orgId)`
**Use**: Baseline for calculating percentages

#### Active Clients (Snapshot)
**Definition**: Clients with at least one active package (not completed AND not expired)
**Calculation**:
```sql
COUNT(DISTINCT clients WHERE EXISTS (
  package WHERE
    clientId = client.id AND
    remainingSessions > 0 AND
    (expiresAt IS NULL OR expiresAt > NOW())
))
```
**Use**: Core health metric - how many clients are currently engaged

#### Not Started Clients (Snapshot)
**Definition**: Clients with at least one active package AND zero sessions logged against ANY of their active packages
- Once a client completes even 1 session against any active package, they are no longer "Not Started"
- This is a client-level status, not per-package

**Calculation (Prisma)**:
```typescript
prisma.client.count({
  where: {
    ...clientsWhere,
    // Has at least one active package
    packages: {
      some: {
        remainingSessions: { gt: 0 },
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
      }
    },
    // AND no sessions exist against any of their active packages
    sessions: {
      none: {
        package: {
          remainingSessions: { gt: 0 },
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
        }
      }
    }
  }
})
```
**Use**: Identifies clients who bought but haven't started - may need onboarding outreach

#### Lost Clients (Snapshot)
**Definition**: Clients who have had packages before, but none are currently active
**Calculation**:
```sql
COUNT(clients WHERE
  organizationId = :orgId AND
  EXISTS (package WHERE clientId = client.id) AND  -- Has had at least one package
  NOT EXISTS (
    package WHERE
      clientId = client.id AND
      remainingSessions > 0 AND
      (expiresAt IS NULL OR expiresAt > NOW())
  )
)
```
**Use**: Total churned clients - target for win-back campaigns

#### At-Risk Clients (Snapshot)
**Definition**: Clients with packages expiring in the next 14 days that still have remaining sessions
**Calculation**:
```sql
COUNT(DISTINCT clients WHERE EXISTS (
  package WHERE
    clientId = client.id AND
    remainingSessions > 0 AND
    expiresAt IS NOT NULL AND
    expiresAt BETWEEN NOW() AND NOW() + 14 DAYS
))
```
**Use**: Sales opportunity - clients who need outreach before package expires

---

### Period-Based Metrics (Within Time Filter)
These respect the dashboard time filter (day, week, month, custom).

#### New Clients (Period)
**Definition**: Clients who purchased a package in the selected time period AND had no sessions in the 30 days prior to that purchase
**Calculation**:
```sql
COUNT(DISTINCT clients WHERE EXISTS (
  package WHERE
    clientId = client.id AND
    createdAt BETWEEN :startDate AND :endDate AND
    NOT EXISTS (
      session WHERE
        clientId = client.id AND
        sessionDate < package.createdAt AND
        sessionDate >= package.createdAt - 30 DAYS
    )
))
```
**Use**: Measures client acquisition in the period

#### Resold Clients (Period)
**Definition**: Package sales in the period to clients who either:
- Had an active package at time of purchase (upsell/early renewal), OR
- Had their last session within 30 days of the new package purchase (timely renewal)

**Calculation**:
```sql
COUNT(packages WHERE
  createdAt BETWEEN :startDate AND :endDate AND
  (
    -- Had an active package at time of purchase
    EXISTS (
      other_package WHERE
        clientId = package.clientId AND
        other_package.id != package.id AND
        remainingSessions > 0 AND
        (expiresAt IS NULL OR expiresAt > package.createdAt)
    )
    OR
    -- Last session was within 30 days of purchase
    EXISTS (
      session WHERE
        clientId = package.clientId AND
        sessionDate >= package.createdAt - 30 DAYS AND
        sessionDate < package.createdAt
    )
  )
)
```
**Note**: This counts package sale events (one client can have multiple resells)
**Use**: Measures retention / renewal success in the period

#### Newly Lost Clients (Period)
**Definition**: Clients whose last active package completed or expired within the time filter, and they have no new active package
**Calculation**:
```sql
COUNT(DISTINCT clients WHERE
  -- Their most recent package ended in this period
  EXISTS (
    package WHERE
      clientId = client.id AND
      (
        (remainingSessions = 0 AND updatedAt BETWEEN :startDate AND :endDate) OR
        (expiresAt BETWEEN :startDate AND :endDate)
      )
  ) AND
  -- And they have no active package now
  NOT EXISTS (
    package WHERE
      clientId = client.id AND
      remainingSessions > 0 AND
      (expiresAt IS NULL OR expiresAt > NOW())
  )
)
```
**Use**: Shows churn rate for the period - "How many clients did we lose this month?"

---

## Configuration

### Thresholds (Consider Making Configurable)
| Setting | Default Value | Description |
|---------|---------------|-------------|
| NEW_CLIENT_LOOKBACK_DAYS | 30 | Days to look back for prior sessions |
| RESOLD_CLIENT_LOOKBACK_DAYS | 30 | Days window for "timely renewal" |
| AT_RISK_DAYS_AHEAD | 14 | Days ahead to check for expiring packages |

For MVP, these can be constants. Future: Add to organization settings.

---

## Implementation Plan

### Phase 1: Create Helper Functions (Complexity: 4/10)

#### Step 1.1: Create Package Status Helper (`src/lib/package-status.ts`)
```typescript
// Helper functions for package status determination

export function isPackageActive(pkg: { remainingSessions: number; expiresAt: Date | null }): boolean {
  const now = new Date()
  return pkg.remainingSessions > 0 && (pkg.expiresAt === null || pkg.expiresAt > now)
}

export function isPackageCompleted(pkg: { remainingSessions: number }): boolean {
  return pkg.remainingSessions === 0
}

export function isPackageExpired(pkg: { expiresAt: Date | null }): boolean {
  if (pkg.expiresAt === null) return false
  return pkg.expiresAt < new Date()
}

export function isPackageExpiringSoon(pkg: { expiresAt: Date | null; remainingSessions: number }, daysAhead = 14): boolean {
  if (pkg.expiresAt === null) return false
  if (pkg.remainingSessions === 0) return false

  const now = new Date()
  const threshold = new Date()
  threshold.setDate(threshold.getDate() + daysAhead)

  return pkg.expiresAt > now && pkg.expiresAt <= threshold
}
```

### Phase 2: Update Dashboard API (Complexity: 6/10)

#### Step 2.1: Add New Metrics to Dashboard Response
Modify `/api/dashboard/route.ts` to calculate and return new metrics:

```typescript
// Add to the Promise.all for managers/admins

// Total clients (all client profiles)
const totalClients = await prisma.client.count({
  where: clientsWhere
})

// Active clients (have at least one active package)
const activeClientsWithPackages = await prisma.client.count({
  where: {
    ...clientsWhere,
    packages: {
      some: {
        remainingSessions: { gt: 0 },
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      }
    }
  }
})

// New clients (purchased package in period, no prior sessions in 30 days)
// This requires more complex logic - see implementation notes

// Resold clients (package sales to existing/returning clients)
// Count of package sales, not unique clients

// Lost clients (had packages, but none are active now)
const lostClients = await prisma.client.count({
  where: {
    ...clientsWhere,
    packages: {
      some: {} // Has at least one package
    },
    NOT: {
      packages: {
        some: {
          remainingSessions: { gt: 0 },
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        }
      }
    }
  }
})

// At-risk clients (packages expiring in next 14 days with sessions remaining)
const atRiskClients = await prisma.client.count({
  where: {
    ...clientsWhere,
    packages: {
      some: {
        remainingSessions: { gt: 0 },
        expiresAt: {
          gte: new Date(),
          lte: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
        }
      }
    }
  }
})
```

#### Step 2.2: Handle New Clients Query
New clients calculation requires checking for absence of prior sessions:

```typescript
// Get packages created in the period
const packagesInPeriod = await prisma.package.findMany({
  where: {
    organizationId,
    createdAt: { gte: dateFrom, lte: dateTo },
    client: clientsWhere.locationId ? { locationId: clientsWhere.locationId } : undefined
  },
  select: {
    clientId: true,
    createdAt: true
  }
})

// For each client, check if they had sessions in 30 days prior to purchase
const newClientIds = new Set<string>()
for (const pkg of packagesInPeriod) {
  const lookbackDate = new Date(pkg.createdAt)
  lookbackDate.setDate(lookbackDate.getDate() - 30)

  const priorSession = await prisma.session.findFirst({
    where: {
      clientId: pkg.clientId,
      sessionDate: {
        gte: lookbackDate,
        lt: pkg.createdAt
      }
    }
  })

  if (!priorSession) {
    newClientIds.add(pkg.clientId)
  }
}
const newClientsCount = newClientIds.size
```

#### Step 2.3: Handle Resold Clients Query
Resold is count of package sale events, not unique clients:

```typescript
// Get packages created in the period
const packagesInPeriod = await prisma.package.findMany({
  where: {
    organizationId,
    createdAt: { gte: dateFrom, lte: dateTo },
    client: clientsWhere.locationId ? { locationId: clientsWhere.locationId } : undefined
  },
  include: {
    client: {
      include: {
        packages: true,
        sessions: {
          orderBy: { sessionDate: 'desc' },
          take: 1
        }
      }
    }
  }
})

let resoldCount = 0
for (const pkg of packagesInPeriod) {
  // Check if client had an active package at time of this purchase
  const hadActivePackage = pkg.client.packages.some(otherPkg =>
    otherPkg.id !== pkg.id &&
    otherPkg.remainingSessions > 0 &&
    (otherPkg.expiresAt === null || otherPkg.expiresAt > pkg.createdAt)
  )

  // Or had a session within 30 days before purchase
  const lookbackDate = new Date(pkg.createdAt)
  lookbackDate.setDate(lookbackDate.getDate() - 30)

  const recentSession = await prisma.session.findFirst({
    where: {
      clientId: pkg.clientId,
      sessionDate: {
        gte: lookbackDate,
        lt: pkg.createdAt
      }
    }
  })

  if (hadActivePackage || recentSession) {
    resoldCount++
  }
}
```

### Phase 3: Update Dashboard UI (Complexity: 4/10)

#### Step 3.1: Update ManagerDashboard.tsx Stats Grid
Expand the stats grid to show new metrics:

```tsx
// Current: 6-column grid
// New: Need to organize into sections

{/* Client Metrics Section */}
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
  <StatCard label="Total Clients" value={data.stats.totalClients} />
  <StatCard label="Active Clients" value={data.stats.activeClients} />
  <StatCard label="New Clients" value={data.stats.newClients} />
  <StatCard label="Resold" value={data.stats.resoldClients} />
  <StatCard label="Lost Clients" value={data.stats.lostClients} />
  <StatCard label="At Risk" value={data.stats.atRiskClients} variant="warning" />
</div>
```

#### Step 3.2: Add Tooltips/Help Text
Each metric should have a tooltip explaining the definition:

```tsx
<StatCard
  label="Active Clients"
  value={data.stats.activeClients}
  tooltip="Clients with at least one package that has remaining sessions and hasn't expired"
/>
```

#### Step 3.3: Click-Through to Filtered Lists
Each stat should link to a filtered view:

```tsx
<StatCard
  label="At Risk"
  value={data.stats.atRiskClients}
  href="/clients?packageStatus=expiring_soon"
  variant="warning"
/>
```

### Phase 4: Update Types (Complexity: 2/10)

#### Step 4.1: Update DashboardData Interface
```typescript
interface DashboardData {
  stats: {
    // Existing
    totalSessions: number
    validatedSessions: number
    totalSessionValue: number
    validationRate: number
    activeTrainers: number

    // Updated/New Client Metrics
    totalClients: number      // NEW
    activeClients: number     // UPDATED definition
    newClients: number        // NEW
    resoldClients: number     // NEW
    lostClients: number       // NEW
    atRiskClients: number     // NEW
    unassignedClients?: number

    period: {
      from: string
      to: string
    }
  }
  // ... rest
}
```

### Phase 5: Testing (Complexity: 3/10)

#### Test Scenarios
- [ ] Active client shows when they have package with remainingSessions > 0 and not expired
- [ ] Active client does NOT show when all packages are completed (remainingSessions = 0)
- [ ] Active client does NOT show when all packages are expired
- [ ] New client counted when they buy package with no sessions in prior 30 days
- [ ] Returning client (had session 20 days ago) is NOT counted as new
- [ ] Brand new client (first ever package) IS counted as new
- [ ] Resold counts when client has active package and buys another
- [ ] Resold counts when client's last session was within 30 days
- [ ] Resold does NOT count when client had no recent activity
- [ ] Lost client shows when they have packages but none are active
- [ ] At-risk shows packages expiring in next 14 days with sessions remaining
- [ ] All metrics respect location filters for club managers
- [ ] All metrics respect time period filters

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/package-status.ts` | NEW: Helper functions for package status |
| `src/app/api/dashboard/route.ts` | Add new client metrics calculations |
| `src/components/dashboard/ManagerDashboard.tsx` | Update stats grid with new metrics |
| `src/components/dashboard/AdminDashboard.tsx` | Inherits from ManagerDashboard (no changes) |
| `src/components/clients/ClientTable.tsx` | Update tags to show derived client state |
| `src/app/(authenticated)/clients/[id]/page.tsx` | Show client state on detail page |
| `src/app/api/clients/route.ts` or page | Include package data for state derivation |

---

## Phase 6: Client Table State Tags

### Overview
Update the client table and detail pages to show derived client states instead of just the `active` boolean.

### Client State Tags

| State | Color | Condition |
|-------|-------|-----------|
| **Active** | Green | Has active package with at least one session |
| **Not Started** | Blue | Has active package but no sessions against it |
| **At Risk** | Orange | Has active package expiring within 14 days |
| **Lost** | Red | Had packages before but none currently active |
| **New** | Gray | No packages yet (just created) |

### Implementation

#### Step 6.1: Add client state derivation helper
Add to `src/lib/package-status.ts`:
```typescript
export function getClientState(client: {
  packages: Array<{ remainingSessions: number; expiresAt: Date | null }>;
  sessions: Array<{ packageId: string }>;
}): 'active' | 'not_started' | 'at_risk' | 'lost' | 'new'
```

#### Step 6.2: Update ClientTable.tsx
- Fetch package data with client query
- Derive state and display appropriate tag
- Priority: At Risk > Not Started > Active > Lost > New

#### Step 6.3: Update Client Detail Page
- Show state prominently on client detail page

---

## API Response Changes

### Current Response (stats object)
```json
{
  "stats": {
    "totalSessions": 45,
    "validatedSessions": 40,
    "totalSessionValue": 4500,
    "validationRate": 89,
    "activeTrainers": 5,
    "activeClients": 25,
    "unassignedClients": 3
  }
}
```

### New Response (stats object)
```json
{
  "stats": {
    // Session metrics (unchanged)
    "totalSessions": 45,
    "validatedSessions": 40,
    "totalSessionValue": 4500,
    "validationRate": 89,
    "activeTrainers": 5,

    // Client metrics - Snapshots (current state)
    "clientMetrics": {
      "total": 50,
      "active": 25,
      "notStarted": 3,
      "atRisk": 4,
      "lost": 18
    },

    // Client metrics - Period-based (within time filter)
    "clientMetricsPeriod": {
      "newClients": 5,
      "resoldPackages": 8,
      "newlyLost": 2
    },

    "unassignedClients": 3
  }
}
```

---

## Migration: Client `active` Boolean

### Current State
The Client model has an `active` boolean that is:
- Manually set when creating/editing clients
- Used to "archive" clients (set to false)
- Used in the dashboard for "activeClients" count

### Decision
The `active` boolean should remain but serve a **different purpose**:
- Keep as a **manual archive flag** (soft delete)
- Do NOT use it to determine if a client is "active" in the business sense
- Client state (Active, Lost, At-Risk, etc.) should be **derived from package status**

### Implementation Approach
1. **Dashboard metrics**: Derive from package status, ignore `client.active`
2. **Client list default filter**: Still use `client.active = true` to hide archived
3. **"Active" tag on client**: Derive from package status
4. **Rename consideration**: Consider renaming `active` to `archived` (inverse) in future refactor

### No Schema Migration Needed
The `active` field stays as-is. We just change how we interpret "active client" in the dashboard.

---

## Performance Considerations

The new/resold calculations involve iterating through packages and checking for prior sessions. For organizations with many packages, this could be slow.

**Optimizations to consider:**
1. Use raw SQL with subqueries instead of Prisma loops
2. Add database indexes on `package.createdAt` and `session.sessionDate`
3. Cache results for time periods that have passed (historical data won't change)
4. Consider materialized views for frequently-accessed metrics

For MVP, the loop approach is acceptable. Optimize if performance issues arise.

---

## Success Criteria

1. **Accurate Active Clients**: Count reflects clients with active packages, not just `client.active` flag
2. **New Client Tracking**: Can see how many new clients acquired in a period
3. **Resold Tracking**: Can see package renewal/upsell success
4. **Lost Client Visibility**: Can identify churned clients
5. **At-Risk Alerts**: Can proactively reach out before packages expire
6. **Filter Respect**: All metrics respect location and time period filters

---

## Definition of Done

### Backend
- [ ] Package status helper functions created (`src/lib/package-status.ts`)
- [ ] Client state derivation logic implemented
- [ ] Dashboard API returns snapshot metrics (total, active, notStarted, atRisk, lost)
- [ ] Dashboard API returns period metrics (newClients, resoldPackages, newlyLost)
- [ ] Snapshot metrics ignore time filter (show current state)
- [ ] Period metrics respect time filter
- [ ] All metrics respect location filters (for club managers)
- [ ] Deprecate reliance on `client.active` boolean for these calculations

### Frontend
- [ ] Dashboard UI displays snapshot metrics in dedicated section
- [ ] Dashboard UI displays period metrics (respecting time filter)
- [ ] Tooltips explain each metric's definition
- [ ] At-risk clients highlighted with warning styling
- [ ] Not-started clients highlighted (needs attention)
- [ ] Click-through links to filtered client lists (stretch goal)
- [ ] Client table shows derived state tags (Active, Not Started, At Risk, Lost)
- [ ] Client detail page shows client state

### Testing
- [ ] Active client counted when has package with remainingSessions > 0 and not expired
- [ ] Not Started client counted when has active package but zero sessions
- [ ] Lost client counted when has packages but none active
- [ ] At-Risk client counted when package expiring in 14 days with sessions remaining
- [ ] New client counted when bought package with no sessions in prior 30 days
- [ ] Resold counted for package sales to active/recent clients
- [ ] Newly Lost counted when package ended in period and no replacement
- [ ] Location filter works correctly for all metrics
- [ ] No performance regression on dashboard load

### Documentation
- [ ] Update schema.md if Client model changes
- [ ] Update API.md with new response structure