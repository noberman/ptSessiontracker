'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { PageSizeSelector } from '@/components/ui/PageSizeSelector'

interface Package {
  id: string
  name: string
  packageType: string
  totalSessions: number
  remainingSessions: number
  totalValue: number
  sessionValue: number
  active: boolean
  startDate: string | Date | null
  expiresAt: string | Date | null
  client: {
    id: string
    name: string
    email: string
    primaryTrainer?: {
      id: string
      name: string
    } | null
  }
  _count: {
    sessions: number
  }
}

interface PackageTableProps {
  initialPackages: Package[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  canEdit?: boolean
  canDelete?: boolean
}

export function PackageTable({ 
  initialPackages, 
  pagination: initialPagination,
  canEdit = false,
  canDelete = false
}: PackageTableProps) {
  const [packages, setPackages] = useState(initialPackages)
  const [pagination, setPagination] = useState(initialPagination)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Update local state when props change (e.g., after filtering)
  useEffect(() => {
    setPackages(initialPackages)
    setPagination(initialPagination)
  }, [initialPackages, initialPagination])
  
  // Fetch packages when page or limit changes
  const fetchPackages = async (targetPage: number, targetLimit?: number) => {
    setLoading(true)
    try {
      const params = new URLSearchParams(searchParams.toString())
      params.set('page', String(targetPage))
      if (targetLimit) {
        params.set('limit', String(targetLimit))
      }
      
      const response = await fetch(`/api/packages/list?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch packages')
      
      const data = await response.json()
      setPackages(data.packages)
      setPagination(data.pagination)
      
      // Update URL without page refresh
      router.push(`/packages?${params.toString()}`, { scroll: false })
    } catch (error) {
      console.error('Error fetching packages:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePageSizeChange = (newLimit: number) => {
    // Reset to page 1 when changing page size
    fetchPackages(1, newLimit)
  }

  const formatDate = (date: string | Date | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const getStatusBadge = (pkg: Package) => {
    if (pkg.expiresAt && new Date(pkg.expiresAt) < new Date()) {
      return <Badge variant="error" size="sm">Expired</Badge>
    }
    if (pkg.remainingSessions === 0) {
      return <Badge variant="gray" size="sm">Completed</Badge>
    }
    if (pkg.active) {
      return <Badge variant="success" size="sm">Active</Badge>
    }
    return <Badge variant="gray" size="sm">Inactive</Badge>
  }

  const getPackageTypeBadge = (type: string) => {
    const typeColors = {
      MONTHLY: 'secondary',
      QUARTERLY: 'default',
      ANNUAL: 'warning',
      CUSTOM: 'gray',
    } as const
    
    return (
      <Badge 
        variant={typeColors[type as keyof typeof typeColors] || 'default'} 
        size="sm"
      >
        {type}
      </Badge>
    )
  }

  return (
    <Card padding="none">
      <div className="overflow-x-auto relative">
        {loading && (
          <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
            <div className="text-sm text-text-secondary">Loading...</div>
          </div>
        )}
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-background-secondary">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Package
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Client
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Sessions
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Expiry
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-surface divide-y divide-border">
            {packages.map((pkg) => (
              <tr key={pkg.id} className="hover:bg-surface-hover transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-text-primary">
                    {pkg.name}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-text-primary">
                    {pkg.client.name}
                  </div>
                  <div className="text-sm text-text-secondary">
                    {pkg.client.email}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getPackageTypeBadge(pkg.packageType)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-text-primary">
                    {pkg.remainingSessions} / {pkg.totalSessions}
                  </div>
                  <div className="text-xs text-text-secondary">
                    {pkg._count.sessions} used
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary">
                  {formatCurrency(pkg.totalValue)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                  {formatDate(pkg.expiresAt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(pkg)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex space-x-2">
                    <Link href={`/packages/${pkg.id}`}>
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </Link>
                    {canEdit && (
                      <Link href={`/packages/${pkg.id}/edit`}>
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                      </Link>
                    )}
                    {canDelete && (
                      <Button variant="danger" size="sm">
                        Delete
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      <div className="px-6 py-3 flex items-center justify-between border-t border-border bg-background-secondary">
        <div className="text-sm text-text-secondary">
          Showing {packages.length > 0 ? ((pagination.page - 1) * pagination.limit) + 1 : 0} to{' '}
          {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
          {pagination.total} results
        </div>
        <div className="flex items-center gap-4">
          <PageSizeSelector
            value={pagination.limit}
            onChange={handlePageSizeChange}
            disabled={loading}
          />
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === 1 || loading}
              onClick={() => fetchPackages(pagination.page - 1)}
            >
              {loading ? 'Loading...' : 'Previous'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === pagination.totalPages || loading}
              onClick={() => fetchPackages(pagination.page + 1)}
            >
              {loading ? 'Loading...' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}