/**
 * Package Status Helper Functions
 *
 * Centralized logic for determining package and client states.
 * Used by dashboard metrics and client status displays.
 */

// Types for package status checks
interface PackageForStatusCheck {
  remainingSessions: number
  expiresAt: Date | null
}

interface PackageWithSessions extends PackageForStatusCheck {
  id: string
  _count?: {
    sessions: number
  }
}

// =============================================================================
// Package Status Functions
// =============================================================================

/**
 * Check if a package is currently active
 * Active = has remaining sessions AND not expired
 */
export function isPackageActive(pkg: PackageForStatusCheck): boolean {
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
 * Get the status of a package as a string
 */
export function getPackageStatus(pkg: PackageForStatusCheck): 'active' | 'completed' | 'expired' | 'expiring_soon' {
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

export type ClientState = 'active' | 'not_started' | 'at_risk' | 'lost' | 'new'

interface PackageForClientState {
  id: string
  remainingSessions: number
  expiresAt: Date | null
  _count?: {
    sessions: number
  }
}

interface ClientForStateCheck {
  packages: PackageForClientState[]
}

/**
 * Derive a client's state based on their packages and sessions
 *
 * Priority order (highest to lowest):
 * 1. at_risk - Has active package expiring soon (most urgent)
 * 2. not_started - Has active package but no sessions (needs onboarding)
 * 3. active - Has active package with sessions (healthy)
 * 4. lost - Had packages but none active (churned)
 * 5. new - No packages ever (just created)
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

  // Check if any active package is expiring soon
  const hasAtRiskPackage = activePackages.some(pkg =>
    isPackageExpiringSoon(pkg, CLIENT_METRICS_CONFIG.AT_RISK_DAYS_AHEAD)
  )
  if (hasAtRiskPackage) {
    return 'at_risk'
  }

  // Check if any active package has sessions
  // _count.sessions represents sessions logged against that specific package
  const hasSessionsAgainstActivePackage = activePackages.some(pkg =>
    pkg._count && pkg._count.sessions > 0
  )

  if (!hasSessionsAgainstActivePackage) {
    return 'not_started'
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
    case 'at_risk':
      return {
        label: 'At Risk',
        color: 'text-orange-700',
        bgColor: 'bg-orange-100',
        description: 'Package expiring soon'
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

  // Days ahead to check for "at risk" packages
  AT_RISK_DAYS_AHEAD: 14
}
