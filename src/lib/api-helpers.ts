import { NextRequest, NextResponse } from 'next/server'
import { getOrganizationId } from './organization-context'

/**
 * Wrapper for API route handlers that automatically injects organization context
 * 
 * Usage:
 * export const GET = withOrgContext(async (orgId, request) => {
 *   // Your handler code here, with orgId available
 * })
 */
export function withOrgContext<T extends any[]>(
  handler: (orgId: string, request: NextRequest, ...args: T) => Promise<Response>
) {
  return async (request: NextRequest, ...args: T) => {
    try {
      const orgId = await getOrganizationId()
      return await handler(orgId, request, ...args)
    } catch (error) {
      // If no organization context is found, return unauthorized
      return NextResponse.json(
        { error: 'Unauthorized: No organization context' },
        { status: 401 }
      )
    }
  }
}

/**
 * Create a standard API response with organization context validation
 */
export async function createOrgResponse<T>(
  callback: (orgId: string) => Promise<T>
): Promise<NextResponse> {
  try {
    const orgId = await getOrganizationId()
    const data = await callback(orgId)
    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof Error && error.message.includes('organization context')) {
      return NextResponse.json(
        { error: 'Unauthorized: No organization context' },
        { status: 401 }
      )
    }
    
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Validate that a resource belongs to the current organization
 */
export async function validateResourceOwnership(
  resourceOrgId: string | null
): Promise<boolean> {
  if (!resourceOrgId) return false
  
  try {
    const currentOrgId = await getOrganizationId()
    return resourceOrgId === currentOrgId
  } catch {
    return false
  }
}

/**
 * Standard error responses
 */
export const ApiErrors = {
  unauthorized: () =>
    NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    ),
  
  forbidden: () =>
    NextResponse.json(
      { error: 'Forbidden: You do not have access to this resource' },
      { status: 403 }
    ),
  
  notFound: () =>
    NextResponse.json(
      { error: 'Resource not found' },
      { status: 404 }
    ),
  
  badRequest: (message: string) =>
    NextResponse.json(
      { error: message },
      { status: 400 }
    ),
  
  serverError: (error?: Error) => {
    console.error('Server error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}