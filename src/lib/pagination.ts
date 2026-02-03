/**
 * Pagination utility for API routes
 * Extracts and validates pagination parameters from URL search params
 */

export interface PaginationParams {
  page: number
  limit: number
  skip: number
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasMore: boolean
}

/**
 * Parse pagination parameters from URL search params
 * @param searchParams - URLSearchParams or NextRequest.nextUrl.searchParams
 * @param defaults - Optional default values
 * @returns Validated pagination parameters
 */
export function parsePagination(
  searchParams: URLSearchParams | { get: (key: string) => string | null },
  defaults: { page?: number; limit?: number } = {}
): PaginationParams {
  const defaultPage = defaults.page ?? 1
  const defaultLimit = defaults.limit ?? 10

  const page = Math.max(1, parseInt(searchParams.get('page') || String(defaultPage)))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || String(defaultLimit))))
  const skip = (page - 1) * limit

  return { page, limit, skip }
}

/**
 * Build pagination metadata for API responses
 * @param total - Total count of items
 * @param pagination - Current pagination params
 * @returns Pagination metadata object
 */
export function buildPaginationMeta(
  total: number,
  pagination: PaginationParams
): PaginationMeta {
  const totalPages = Math.ceil(total / pagination.limit)

  return {
    page: pagination.page,
    limit: pagination.limit,
    total,
    totalPages,
    hasMore: pagination.page < totalPages
  }
}
