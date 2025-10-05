import { prisma } from '@/lib/prisma'

/**
 * Get all location IDs that a user has access to
 * For ADMIN users, returns null (meaning all locations)
 * For other users, returns array of accessible location IDs
 */
export async function getUserAccessibleLocations(userId: string, userRole: string): Promise<string[] | null> {
  // Admins have access to all locations
  if (userRole === 'ADMIN') {
    return null
  }

  // For all other roles, get their accessible locations from UserLocation table only
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      locations: {
        select: { locationId: true }
      }
    }
  })

  // Collect all accessible location IDs from junction table
  const accessibleLocationIds: string[] = []
  
  // Add locations from junction table (new system only)
  if (user?.locations) {
    user.locations.forEach(loc => {
      if (!accessibleLocationIds.includes(loc.locationId)) {
        accessibleLocationIds.push(loc.locationId)
      }
    })
  }

  return accessibleLocationIds
}

/**
 * Check if a user has access to a specific location
 */
export async function userHasLocationAccess(userId: string, userRole: string, locationId: string): Promise<boolean> {
  // Admins have access to all locations
  if (userRole === 'ADMIN') {
    return true
  }

  const accessibleLocations = await getUserAccessibleLocations(userId, userRole)
  return accessibleLocations ? accessibleLocations.includes(locationId) : false
}