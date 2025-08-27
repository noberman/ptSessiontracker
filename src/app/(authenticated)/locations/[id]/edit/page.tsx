import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { LocationForm } from '@/components/locations/LocationForm'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { ChevronLeft } from 'lucide-react'

export default async function EditLocationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  // Only admins and PT managers can edit locations
  if (session.user.role !== 'ADMIN' && session.user.role !== 'PT_MANAGER') {
    redirect('/locations')
  }

  // Fetch location data
  const location = await prisma.location.findUnique({
    where: { id }
  })

  if (!location) {
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
        <h1 className="text-2xl font-bold text-text-primary">Edit Location</h1>
        <p className="text-sm text-text-secondary mt-1">
          Update location details for {location.name}
        </p>
      </div>

      <LocationForm location={location} isEdit />
    </div>
  )
}