/**
 * Package Status Helper Functions
 *
 * Centralized logic for determining package and client states.
 * Used by dashboard metrics and client status displays.
 */

// Types for package status checks
interface PackageForStatusCheck {
  remainingSessions: number
  totalSessions: number
  expiresAt: Date | null
  effectiveStartDate?: Date | null
  packageTypeId?: string | null
}

interface PackageWithSessions extends PackageForStatusCheck {
  id: string
}

// =============================================================================
// Package Status Functions
// =============================================================================

/**
 * Check if a package is currently active
 * Active = has remaining sessions AND not expired AND not in "not started" state
 */
export function isPackageActive(pkg: PackageForStatusCheck): boolean {
  if (isPackageNotStarted(pkg)) return false
  const now = new Date()
  const hasRemainingSessions = pkg.remainingSessions > 0
  const notExpired = pkg.expiresAt === null || pkg.expiresAt > now
  return hasRemainingSessions && notExpired
}

/**
 * Check if a package is completed (all sessions used)
 */
export function isPackageCompleted(pkg: Pick<PackageForStatusCheck, 'remainingSessions'>): boolean {
  return pkg.remainingSessions === 0
}

/**
 * Check if a package is expired
 */
export function isPackageExpired(pkg: Pick<PackageForStatusCheck, 'expiresAt'>): boolean {
  if (pkg.expiresAt === null) return false
  return pkg.expiresAt < new Date()
}

/**
 * Check if a package is expiring soon (within specified days)
 * Only returns true if package is still active (has sessions and not yet expired)
 */
export function isPackageExpiringSoon(
  pkg: PackageForStatusCheck,
  daysAhead: number = 14
): boolean {
  if (pkg.expiresAt === null) return false
  if (pkg.remainingSessions === 0) return false

  const now = new Date()
  const threshold = new Date()
  threshold.setDate(threshold.getDate() + daysAhead)

  // Must be: not expired yet AND expiring within threshold
  return pkg.expiresAt > now && pkg.expiresAt <= threshold
}

/**
 * Check if a package is in "not started" state.
 * A package is not started when it was created with a FIRST_SESSION trigger
 * and no session has been logged yet (effectiveStartDate is null).
 * Only applies to packages linked to a package type (packageTypeId is set).
 */
export function isPackageNotStarted(pkg: PackageForStatusCheck): boolean {
  return pkg.packageTypeId != null && pkg.effectiveStartDate === null && pkg.effectiveStartDate !== undefined
}

/**
 * Get the status of a package as a string
 */
export function getPackageStatus(pkg: PackageForStatusCheck): 'not_started' | 'active' | 'completed' | 'expired' | 'expiring_soon' {
  if (isPackageNotStarted(pkg)) return 'not_started'
  if (isPackageExpired(pkg)) return 'expired'
  if (isPackageCompleted(pkg)) return 'completed'
  if (isPackageExpiringSoon(pkg)) return 'expiring_soon'
  if (isPackageActive(pkg)) return 'active'
  return 'completed' // fallback
}

// =============================================================================
// Prisma Where Clause Builders
// =============================================================================

/**
 * Prisma where clause for active packages
 * Use in: packages: { some: getActivePackageWhereClause() }
 */
export function getActivePackageWhereClause() {
  return {
    remainingSessions: { gt: 0 },
    OR: [
      { expiresAt: null },
      { expiresAt: { gt: new Date() } }
    ]
  }
}

/**
 * Prisma where clause for expiring soon packages
 * @param daysAhead Number of days to look ahead (default 14)
 */
export function getExpiringSoonPackageWhereClause(daysAhead: number = 14) {
  const now = new Date()
  const threshold = new Date()
  threshold.setDate(threshold.getDate() + daysAhead)

  return {
    remainingSessions: { gt: 0 },
    expiresAt: {
      not: null,
      gte: now,
      lte: threshold
    }
  }
}

// =============================================================================
// Client State Derivation
// =============================================================================

export type ClientState = 'active' | 'not_started' | 'fading' | 'at_risk' | 'lost' | 'new'

interface PackageForClientState {
  id: string
  remainingSessions: number
  totalSessions: number
  expiresAt: Date | null
  effectiveStartDate?: Date | null
  packageTypeId?: string | null
}

interface ClientForStateCheck {
  packages: PackageForClientState[]
  lastSessionDate?: Date | null
}

/**
 * Derive a client's state based on their packages and sessions
 *
 * Priority order (highest to lowest):
 * 1. new - No packages ever (just created)
 * 2. lost - Had packages but none active (churned)
 * 3. at_risk - Has active package at risk (expiring soon OR low sessions)
 * 4. not_started - All active packages untouched (remaining === total)
 * 5. fading - Has started but no session in 30+ days
 * 6. active - Has active package with recent sessions (healthy)
 */
export function getClientState(client: ClientForStateCheck): ClientState {
  const packages = client.packages || []

  // No packages = new client
  if (packages.length === 0) {
    return 'new'
  }

  // Find active packages
  const activePackages = packages.filter(pkg => isPackageActive(pkg))

  // No active packages = lost client
  if (activePackages.length === 0) {
    return 'lost'
  }

  // Check if any active package is at risk (expiring soon OR low sessions)
  const hasAtRiskPackage = activePackages.some(pkg => isPackageAtRisk(pkg))
  if (hasAtRiskPackage) {
    return 'at_risk'
  }

  // Check if all active packages are untouched (remaining === total)
  const allUntouched = activePackages.every(pkg => pkg.remainingSessions === pkg.totalSessions)
  if (allUntouched) {
    return 'not_started'
  }

  // Check if client has started but no session in last 30 days
  if (client.lastSessionDate) {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    if (new Date(client.lastSessionDate) < thirtyDaysAgo) {
      return 'fading'
    }
  }

  return 'active'
}

/**
 * Get display properties for a client state
 */
export function getClientStateDisplay(state: ClientState): {
  label: string
  color: string
  bgColor: string
  description: string
} {
  switch (state) {
    case 'active':
      return {
        label: 'Active',
        color: 'text-green-700',
        bgColor: 'bg-green-100',
        description: 'Has active package with sessions'
      }
    case 'not_started':
      return {
        label: 'Not Started',
        color: 'text-blue-700',
        bgColor: 'bg-blue-100',
        description: 'Has package but no sessions yet'
      }
    case 'fading':
      return {
        label: 'Fading',
        color: 'text-yellow-700',
        bgColor: 'bg-yellow-100',
        description: 'No session in 30+ days'
      }
    case 'at_risk':
      return {
        label: 'At Risk',
        color: 'text-orange-700',
        bgColor: 'bg-orange-100',
        description: 'Package expiring soon or low sessions'
      }
    case 'lost':
      return {
        label: 'Lost',
        color: 'text-red-700',
        bgColor: 'bg-red-100',
        description: 'No active packages'
      }
    case 'new':
      return {
        label: 'New',
        color: 'text-gray-700',
        bgColor: 'bg-gray-100',
        description: 'No packages yet'
      }
  }
}

// =============================================================================
// Client State Filter Helpers (for Prisma queries)
// =============================================================================

/**
 * Build Prisma where clause to filter clients by state(s)
 * Returns conditions to be merged with existing where clause
 *
 * @param states Array of client states to filter by
 * @returns Prisma where conditions (OR of all selected states)
 */
export function getClientStateFilterWhereClause(states: ClientState[]): any {
  if (!states || states.length === 0) {
    return {} // No filter
  }

  const now = new Date()
  const atRiskThreshold = new Date()
  atRiskThreshold.setDate(atRiskThreshold.getDate() + CLIENT_METRICS_CONFIG.AT_RISK_DAYS_AHEAD)

  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const activePackageCondition = {
    remainingSessions: { gt: 0 },
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }]
  }

  const stateConditions: any[] = []

  for (const state of states) {
    switch (state) {
      case 'active':
        // Has active package + has sessions against active package + has session in last 30 days
        stateConditions.push({
          packages: {
            some: activePackageCondition
          },
          sessions: {
            some: {
              sessionDate: { gte: thirtyDaysAgo }
            }
          }
        })
        break

      case 'not_started':
        // Has active package but no sessions against any active package
        // Note: Uses session-based check. For imported packages where sessions were
        // consumed externally, getClientState() (in-memory) uses remainingSessions === totalSessions
        // for accurate tagging.
        stateConditions.push({
          packages: {
            some: activePackageCondition
          },
          NOT: {
            sessions: {
              some: {
                package: activePackageCondition
              }
            }
          }
        })
        break

      case 'fading':
        // Has active package + has sessions against active package (started) + no session in last 30 days
        stateConditions.push({
          packages: {
            some: activePackageCondition
          },
          sessions: {
            some: {
              package: activePackageCondition
            }
          },
          NOT: {
            sessions: {
              some: {
                sessionDate: { gte: thirtyDaysAgo }
              }
            }
          }
        })
        break

      case 'at_risk':
        // Has active package that is at risk (expiring soon OR low sessions)
        stateConditions.push({
          packages: {
            some: getAtRiskPackageWhereClause()
          }
        })
        break

      case 'lost':
        // Had packages but none are currently active
        stateConditions.push({
          packages: {
            some: {} // Has at least one package
          },
          NOT: {
            packages: {
              some: activePackageCondition
            }
          }
        })
        break

      case 'new':
        // No packages at all
        stateConditions.push({
          packages: {
            none: {}
          }
        })
        break
    }
  }

  // If multiple states selected, OR them together
  if (stateConditions.length === 1) {
    return stateConditions[0]
  }

  return { OR: stateConditions }
}

// =============================================================================
// Configuration Constants
// =============================================================================

/**
 * Default thresholds for client metrics calculations
 * These could be made configurable per-organization in the future
 */
export const CLIENT_METRICS_CONFIG = {
  // Days to look back for "new client" check (no sessions in this period = new)
  NEW_CLIENT_LOOKBACK_DAYS: 30,

  // Days window for "resold" check (session within this period before purchase = resold)
  RESOLD_CLIENT_LOOKBACK_DAYS: 30,

  // Days ahead to check for "at risk" packages (expiring soon)
  AT_RISK_DAYS_AHEAD: 14,

  // Sessions threshold for "at risk" packages (low sessions remaining)
  AT_RISK_LOW_SESSIONS: 3
}

// =============================================================================
// At-Risk Package Helpers
// =============================================================================

/**
 * Check if a package is at risk (needs renewal follow-up)
 * At risk = expiring soon OR low sessions remaining
 */
export function isPackageAtRisk(pkg: PackageForStatusCheck): boolean {
  // Must be active first
  if (!isPackageActive(pkg)) return false

  // Check if expiring soon
  if (isPackageExpiringSoon(pkg, CLIENT_METRICS_CONFIG.AT_RISK_DAYS_AHEAD)) {
    return true
  }

  // Check if low sessions
  if (pkg.remainingSessions < CLIENT_METRICS_CONFIG.AT_RISK_LOW_SESSIONS) {
    return true
  }

  return false
}

/**
 * Prisma where clause for at-risk packages
 * At risk = active AND (expiring within 14 days OR less than 3 sessions remaining)
 */
export function getAtRiskPackageWhereClause() {
  const now = new Date()
  const threshold = new Date()
  threshold.setDate(threshold.getDate() + CLIENT_METRICS_CONFIG.AT_RISK_DAYS_AHEAD)

  return {
    active: true,
    remainingSessions: { gt: 0 },
    OR: [
      // Expiring soon (has expiration date within threshold)
      {
        expiresAt: {
          not: null,
          gte: now,
          lte: threshold
        }
      },
      // Low sessions remaining (regardless of expiration)
      {
        remainingSessions: { lt: CLIENT_METRICS_CONFIG.AT_RISK_LOW_SESSIONS },
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } }
        ]
      }
    ]
  }
}
