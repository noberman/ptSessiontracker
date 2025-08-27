import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { LocationForm } from '@/components/locations/LocationForm'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { ChevronLeft } from 'lucide-react'

export default async function NewLocationPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  // Only admins and PT managers can create locations
  if (session.user.role !== 'ADMIN' && session.user.role !== 'PT_MANAGER') {
    redirect('/locations')
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/locations">
          <Button variant="ghost" size="sm" className="mb-4">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Locations
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-text-primary">Add New Location</h1>
        <p className="text-sm text-text-secondary mt-1">
          Create a new gym location for managing trainers and clients
        </p>
      </div>

      <LocationForm />
    </div>
  )
}