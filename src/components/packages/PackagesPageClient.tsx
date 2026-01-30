'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { PackageFilters } from '@/components/packages/PackageFilters'
import { PackageTable } from '@/components/packages/PackageTable'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
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
  searchParams
}: PackagesPageClientProps) {
  const [isExporting, setIsExporting] = useState(false)
  const urlSearchParams = useSearchParams()

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
    </div>
  )
}