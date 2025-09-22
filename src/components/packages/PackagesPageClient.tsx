'use client'

import { PackageFilters } from '@/components/packages/PackageFilters'
import { PackageTable } from '@/components/packages/PackageTable'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Settings } from 'lucide-react'

interface PackagesPageClientProps {
  packages: any[]
  pagination: any
  availableClients: any[]
  availableLocations: any[]
  currentUserRole: string
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  canManageTypes: boolean
}

export function PackagesPageClient({
  packages,
  pagination,
  availableClients,
  availableLocations,
  currentUserRole,
  canCreate,
  canEdit,
  canDelete,
  canManageTypes
}: PackagesPageClientProps) {
  return (
    <div className="min-h-screen bg-background-secondary">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Packages</h1>
              <p className="text-sm text-text-secondary mt-1">
                Manage client packages and track sessions
              </p>
            </div>
            <div className="flex items-center gap-3">
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
          currentUserRole={currentUserRole}
        />
        
        <PackageTable 
          initialPackages={packages}
          pagination={pagination}
          canEdit={canEdit}
          canDelete={canDelete}
        />
      </div>
    </div>
  )
}