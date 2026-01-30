'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { RefreshCw, PackageCheck } from 'lucide-react'

interface ArchivedPackage {
  id: string
  name: string
  packageType: string
  totalSessions: number
  remainingSessions: number
  totalValue: number
  sessionValue: number
  client: {
    id: string
    name: string
    email: string
  }
  _count: {
    sessions: number
  }
  updatedAt: string | Date
}

interface ArchivedPackagesTableProps {
  packages: ArchivedPackage[]
  loading: boolean
  onReactivate: (packageId: string) => Promise<void>
  onRefresh: () => void
  canEdit: boolean
}

export function ArchivedPackagesTable({
  packages,
  loading,
  onReactivate,
  onRefresh,
  canEdit,
}: ArchivedPackagesTableProps) {
  const [reactivatingIds, setReactivatingIds] = useState<Set<string>>(new Set())

  const handleReactivate = async (packageId: string) => {
    setReactivatingIds(prev => new Set(prev).add(packageId))
    try {
      await onReactivate(packageId)
    } finally {
      setReactivatingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(packageId)
        return newSet
      })
    }
  }

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-8">
          <div className="text-sm text-text-secondary">Loading archived packages...</div>
        </div>
      </Card>
    )
  }

  if (packages.length === 0) {
    return (
      <Card>
        <div className="text-center py-8">
          <p className="text-text-secondary">No archived packages found</p>
          <p className="text-sm text-text-tertiary mt-2">
            Deactivated packages will appear here and can be reactivated
          </p>
        </div>
      </Card>
    )
  }

  return (
    <Card padding="none">
      <div className="flex items-center justify-between px-6 py-3 border-b border-border">
        <h3 className="text-sm font-medium text-text-primary">
          Archived Packages ({packages.length})
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="overflow-x-auto">
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
                Sessions
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Value
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Deactivated On
              </th>
              {canEdit && (
                <th className="px-6 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-surface divide-y divide-border">
            {packages.map(pkg => (
              <tr key={pkg.id} className="hover:bg-surface-hover transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-text-primary">{pkg.name}</div>
                  {pkg.packageType && (
                    <div className="text-xs text-text-secondary">{pkg.packageType}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link href={`/clients/${pkg.client.id}`} className="text-sm font-medium text-primary-600 hover:text-primary-700">
                    {pkg.client.name}
                  </Link>
                  <div className="text-xs text-text-secondary">{pkg.client.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-text-primary">
                    {pkg.remainingSessions} / {pkg.totalSessions}
                  </div>
                  <div className="text-xs text-text-secondary">
                    {pkg._count.sessions} used
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                  {formatCurrency(pkg.totalValue)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-text-secondary">
                    {formatDate(pkg.updatedAt)}
                  </div>
                </td>
                {canEdit && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex justify-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReactivate(pkg.id)}
                        disabled={reactivatingIds.has(pkg.id)}
                      >
                        {reactivatingIds.has(pkg.id) ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <PackageCheck className="h-4 w-4 mr-2" />
                            Reactivate
                          </>
                        )}
                      </Button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
