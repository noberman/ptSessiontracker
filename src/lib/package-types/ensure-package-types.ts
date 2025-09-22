/**
 * Ensures package types exist in the database
 * Creates default types if none exist
 * Called on app startup and when accessing package features
 */

import { prisma } from '@/lib/prisma'

export interface DefaultPackageType {
  name: string
  displayName: string
  description?: string
  defaultSessions?: number | null
  defaultPrice?: number | null
  sortOrder: number
}

// Default package types for new organizations
export const DEFAULT_PACKAGE_TYPES: DefaultPackageType[] = [
  {
    name: 'basic',
    displayName: 'Basic Package',
    description: 'Entry-level training package',
    defaultSessions: 5,
    defaultPrice: 250,
    sortOrder: 1
  },
  {
    name: 'standard',
    displayName: 'Standard Package',
    description: 'Standard training package',
    defaultSessions: 10,
    defaultPrice: 450,
    sortOrder: 2
  },
  {
    name: 'premium',
    displayName: 'Premium Package',
    description: 'Premium training package with more sessions',
    defaultSessions: 20,
    defaultPrice: 800,
    sortOrder: 3
  },
  {
    name: 'elite',
    displayName: 'Elite Package',
    description: 'Elite training package for committed clients',
    defaultSessions: 30,
    defaultPrice: 1100,
    sortOrder: 4
  },
  {
    name: 'custom',
    displayName: 'Custom Package',
    description: 'Customized package tailored to specific needs',
    defaultSessions: null,
    defaultPrice: null,
    sortOrder: 5
  }
]

/**
 * Ensures package types exist for an organization in the database
 * @returns true if types were created, false if they already existed
 */
export async function ensurePackageTypes(organizationId?: string): Promise<boolean> {
  try {
    // If no organizationId provided, we can't proceed
    if (!organizationId) {
      console.log('⚠️  No organizationId provided, skipping package type creation')
      return false
    }
    
    // Check if any package types exist for this organization
    const existingTypes = await prisma.packageType.count({
      where: { organizationId }
    })
    
    if (existingTypes > 0) {
      console.log(`✅ Package types already exist for org ${organizationId} (${existingTypes} types)`)
      return false
    }
    
    console.log(`📦 No package types found for org ${organizationId}, creating defaults...`)
    
    // Create default package types for this organization
    await prisma.packageType.createMany({
      data: DEFAULT_PACKAGE_TYPES.map(type => ({
        ...type,
        organizationId
      }))
    })
    
    console.log(`✅ Default package types created successfully for org ${organizationId}`)
    return true
    
  } catch (error) {
    console.error('❌ Error ensuring package types:', error)
    return false
  }
}

/**
 * Get package types for an organization, creating defaults if none exist
 * This ensures there are always types available
 */
export async function getOrCreatePackageTypes(organizationId?: string) {
  // First ensure types exist for this organization
  if (organizationId) {
    await ensurePackageTypes(organizationId)
  }
  
  // Then return them
  const types = await prisma.packageType.findMany({
    where: organizationId ? { organizationId, isActive: true } : undefined,
    orderBy: { sortOrder: 'asc' }
  })
  
  // If still no types (database issue), return defaults from memory
  if (types.length === 0) {
    console.warn('⚠️  Using in-memory defaults as fallback for package types')
    return DEFAULT_PACKAGE_TYPES
  }
  
  return types
}