import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Plus } from 'lucide-react'
import { LocationsTable } from '@/components/locations/LocationsTable'

export default async function LocationsPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  // Check if user can view locations
  const canCreate = session.user.role === 'ADMIN' || session.user.role === 'PT_MANAGER'
  const canEdit = session.user.role === 'ADMIN' || session.user.role === 'PT_MANAGER'

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Locations</h1>
          <p className="text-sm text-text-secondary mt-1">
            Manage gym locations and view statistics
          </p>
        </div>
        {canCreate && (
          <Link href="/locations/new">
            <Button className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Add Location</span>
            </Button>
          </Link>
        )}
      </div>

      <LocationsTable 
        userRole={session.user.role} 
        canEdit={canEdit}
      />
    </div>
  )
}