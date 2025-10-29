import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { UserForm } from '@/components/users/UserForm'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { ChevronLeft } from 'lucide-react'

export default async function NewUserPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  // Only managers and admins can add users
  if (!['CLUB_MANAGER', 'PT_MANAGER', 'ADMIN'].includes(session.user.role)) {
    redirect('/dashboard')
  }

  // Get current user with organization and locations (for CLUB_MANAGER)
  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      organizationId: true,
      locations: {
        select: {
          locationId: true,
        },
      },
    },
  })

  if (!currentUser?.organizationId) {
    redirect('/dashboard')
  }

  // For CLUB_MANAGER, only show their assigned locations
  // For others, show all active locations in the organization
  const locationFilter = session.user.role === 'CLUB_MANAGER' 
    ? {
        organizationId: currentUser.organizationId,
        active: true,
        id: {
          in: currentUser.locations.map(l => l.locationId),
        },
      }
    : {
        organizationId: currentUser.organizationId,
        active: true,
      }

  const locations = await prisma.location.findMany({
    where: locationFilter,
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: 'asc',
    },
  })

  return (
    <div className="min-h-screen bg-background-secondary">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href="/users">
            <Button variant="ghost" size="sm">
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back to Users
            </Button>
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary">Add New User</h1>
          <p className="text-sm text-text-secondary mt-1">
            Create a new team member account manually
          </p>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="p-6">
            <UserForm 
              locations={locations} 
              currentUserRole={session.user.role}
            />
          </div>
        </div>
      </div>
    </div>
  )
}