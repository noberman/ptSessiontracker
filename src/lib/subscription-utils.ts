import { SUBSCRIPTION_TIERS } from './stripe'

/**
 * Maps database subscription tier values to their display names
 * Database values: FREE, GROWTH, SCALE
 * Display names: Starter, Growth, Scale
 */
export function getSubscriptionDisplayName(tier: keyof typeof SUBSCRIPTION_TIERS | string): string {
  // Handle null/undefined
  if (!tier) return 'Unknown'
  
  // Ensure uppercase for lookup
  const upperTier = tier.toUpperCase()
  
  // Map to display names
  if (upperTier in SUBSCRIPTION_TIERS) {
    return SUBSCRIPTION_TIERS[upperTier as keyof typeof SUBSCRIPTION_TIERS].name
  }
  
  // Fallback to the raw value if not found
  return tier
}

/**
 * Gets the full tier configuration for a subscription tier
 */
export function getSubscriptionTierConfig(tier: keyof typeof SUBSCRIPTION_TIERS | string) {
  const upperTier = tier.toUpperCase()
  
  if (upperTier in SUBSCRIPTION_TIERS) {
    return SUBSCRIPTION_TIERS[upperTier as keyof typeof SUBSCRIPTION_TIERS]
  }
  
  // Return a default config if tier not found
  return SUBSCRIPTION_TIERS.FREE
}

/**
 * Maps display names back to database values
 * Useful for forms or API calls
 */
export function getSubscriptionDatabaseValue(displayName: string): keyof typeof SUBSCRIPTION_TIERS | null {
  const entries = Object.entries(SUBSCRIPTION_TIERS)
  
  for (const [key, config] of entries) {
    if (config.name.toLowerCase() === displayName.toLowerCase()) {
      return key as keyof typeof SUBSCRIPTION_TIERS
    }
  }
  
  return null
}