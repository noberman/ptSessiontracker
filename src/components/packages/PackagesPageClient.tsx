'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PackageFilters } from '@/components/packages/PackageFilters'
import { PackageTable } from '@/components/packages/PackageTable'
import { ArchivedPackagesTable } from '@/components/packages/ArchivedPackagesTable'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Settings, Download } from 'lucide-react'

interface PackagesPageClientProps {
  packages: any[]
  pagination: any
  availableClients: any[]
  availableLocations: any[]
  availablePackageTypes: any[]
  currentUserRole: string
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  canManageTypes: boolean
  archivedCount: number
  searchParams: any
}

export function PackagesPageClient({
  packages,
  pagination,
  availableClients,
  availableLocations,
  availablePackageTypes,
  currentUserRole,
  canCreate,
  canEdit,
  canDelete,
  canManageTypes,
  archivedCount: initialArchivedCount,
  searchParams
}: PackagesPageClientProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [activeTab, setActiveTab] = useState<'packages' | 'archived'>('packages')
  const [archivedPackages, setArchivedPackages] = useState<any[]>([])
  const [archivedCount, setArchivedCount] = useState(initialArchivedCount)
  const [archiveLoading, setArchiveLoading] = useState(false)
  const urlSearchParams = useSearchParams()
  const router = useRouter()

  const fetchArchivedPackages = useCallback(async () => {
    setArchiveLoading(true)
    try {
      const response = await fetch('/api/packages/list?active=false')
      if (!response.ok) throw new Error('Failed to fetch archived packages')
      const data = await response.json()
      setArchivedPackages(data.packages || [])
      setArchivedCount(data.packages?.length || 0)
    } catch (error) {
      console.error('Failed to fetch archived packages:', error)
    } finally {
      setArchiveLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'archived' && archivedPackages.length === 0) {
      fetchArchivedPackages()
    }
  }, [activeTab, fetchArchivedPackages])

  const handleReactivate = async (packageId: string) => {
    try {
      const response = await fetch(`/api/packages/${packageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: true }),
      })
      if (!response.ok) throw new Error('Failed to reactivate package')

      // Remove from archived list and update count
      setArchivedPackages(prev => prev.filter(p => p.id !== packageId))
      setArchivedCount(prev => prev - 1)

      // Refresh the main view to show the reactivated package
      router.refresh()
    } catch (error) {
      console.error('Failed to reactivate package:', error)
      alert('Failed to reactivate package')
    }
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      // Build export URL with current filters from URL
      const params = new URLSearchParams(urlSearchParams.toString())
      // Remove pagination params as we want all results
      params.delete('page')
      params.delete('limit')

      const response = await fetch(`/api/packages/export?${params.toString()}`)
      if (!response.ok) throw new Error('Export failed')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const today = new Date().toISOString().split('T')[0]
      a.download = `packages-export-${today}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to export packages')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div>
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Packages</h1>
              <p className="text-sm text-text-secondary mt-1">
                Manage client packages and track sessions
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={isExporting || packages.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                {isExporting ? 'Exporting...' : 'Export CSV'}
              </Button>
              {canManageTypes && (
                <Link href="/settings/package-types">
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Configure Types
                  </Button>
                </Link>
              )}
              {canCreate && (
                <Link href="/packages/new">
                  <Button>Add New Package</Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 border-b border-border mb-4">
          <button
            onClick={() => setActiveTab('packages')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'packages'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border'
            }`}
          >
            Active Packages
          </button>
          <button
            onClick={() => setActiveTab('archived')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'archived'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border'
            }`}
          >
            Archived
            {archivedCount > 0 && (
              <Badge variant="gray" size="sm">{archivedCount}</Badge>
            )}
          </button>
        </div>

        {activeTab === 'packages' && (
          <>
            <PackageFilters
              clients={availableClients}
              locations={availableLocations}
              packageTypes={availablePackageTypes}
              currentUserRole={currentUserRole}
            />

            <PackageTable
              initialPackages={packages}
              pagination={pagination}
              canEdit={canEdit}
              canDelete={canDelete}
            />
          </>
        )}

        {activeTab === 'archived' && (
          <ArchivedPackagesTable
            packages={archivedPackages}
            loading={archiveLoading}
            onReactivate={handleReactivate}
            onRefresh={fetchArchivedPackages}
            canEdit={canEdit}
          />
        )}
    </div>
  )
}
