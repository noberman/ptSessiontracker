/**
 * Centralized organization filtering utilities
 * Ensures consistent multi-tenant data isolation across the application
 * 
 * After migration, all models have direct organizationId fields for O(log n) filtering
 * instead of expensive JOIN operations
 */

import { Prisma } from '@prisma/client'

/**
 * Get filter for Clients with organization isolation
 * Now uses direct organizationId field (indexed)
 */
export function getClientFilter(organizationId: string, additionalFilters?: Prisma.ClientWhereInput): Prisma.ClientWhereInput {
  return {
    organizationId, // Direct filter - no JOINs needed!
    ...additionalFilters
  }
}

/**
 * Get filter for Packages with organization isolation
 * Now uses direct organizationId field (indexed)
 */
export function getPackageFilter(organizationId: string, additionalFilters?: Prisma.PackageWhereInput): Prisma.PackageWhereInput {
  return {
    organizationId, // Direct filter - no JOINs needed!
    ...additionalFilters
  }
}

/**
 * Get filter for Sessions with organization isolation
 * Now uses direct organizationId field (indexed)
 */
export function getSessionFilter(organizationId: string, additionalFilters?: Prisma.SessionWhereInput): Prisma.SessionWhereInput {
  return {
    organizationId, // Direct filter - no JOINs needed!
    ...additionalFilters
  }
}

/**
 * Get filter for Locations with organization isolation
 */
export function getLocationFilter(organizationId: string, additionalFilters?: Prisma.LocationWhereInput): Prisma.LocationWhereInput {
  return {
    organizationId,
    ...additionalFilters
  }
}

/**
 * Get filter for Users with organization isolation
 */
export function getUserFilter(organizationId: string, additionalFilters?: Prisma.UserWhereInput): Prisma.UserWhereInput {
  return {
    organizationId,
    ...additionalFilters
  }
}

/**
 * Ensure organizationId is set when creating a Client
 */
export function getClientCreateData(
  organizationId: string, 
  data: Omit<Prisma.ClientCreateInput, 'organizationId' | 'organization'>
): Prisma.ClientCreateInput {
  return {
    ...data,
    organization: { connect: { id: organizationId } }
  }
}

/**
 * Ensure organizationId is set when creating a Package
 */
export function getPackageCreateData(
  organizationId: string,
  data: Omit<Prisma.PackageCreateInput, 'organizationId' | 'organization'>
): Prisma.PackageCreateInput {
  return {
    ...data,
    organization: { connect: { id: organizationId } }
  }
}

/**
 * Ensure organizationId is set when creating a Session
 */
export function getSessionCreateData(
  organizationId: string,
  data: Omit<Prisma.SessionCreateInput, 'organizationId' | 'organization'>
): Prisma.SessionCreateInput {
  return {
    ...data,
    organization: { connect: { id: organizationId } }
  }
}