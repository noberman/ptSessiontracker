'use client'

import { Tabs } from '@/components/ui/Tabs'
import { PackageFilters } from '@/components/packages/PackageFilters'
import { PackageTable } from '@/components/packages/PackageTable'
import { PackageTypesTab } from '@/components/packages/PackageTypesTab'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'

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
  const tabs = [
    {
      id: 'packages',
      label: 'Active Packages',
      content: (
        <div>
          <div className="mb-6 flex items-center justify-between">
            {canCreate && (
              <Link href="/packages/new" className="ml-auto">
                <Button>Add New Package</Button>
              </Link>
            )}
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
      )
    }
  ]

  // Add Package Types tab for managers/admins
  if (canManageTypes) {
    tabs.push({
      id: 'types',
      label: 'Package Types',
      content: <PackageTypesTab />
    })
  }

  return (
    <div className="min-h-screen bg-background-secondary">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary">Packages</h1>
          <p className="text-sm text-text-secondary mt-1">
            Manage packages, types, and templates
          </p>
        </div>

        <Tabs tabs={tabs} defaultTab="packages" />
      </div>
    </div>
  )
}