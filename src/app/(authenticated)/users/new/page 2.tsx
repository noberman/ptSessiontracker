import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getUserAccessibleLocations } from '@/lib/user-locations'
import { UserForm } from '@/components/users/UserForm'

export default async function NewUserPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  // Only managers and admins can create users
  if (!['CLUB_MANAGER', 'PT_MANAGER', 'ADMIN'].includes(session.user.role)) {
    redirect('/dashboard')
  }

  // Get locations for the form
  let locations: Array<{ id: string; name: string }> = []
  if (session.user.role === 'CLUB_MANAGER') {
    // Club managers can only see their accessible locations
    const accessibleLocations = await getUserAccessibleLocations(session.user.id, session.user.role)
    if (accessibleLocations && accessibleLocations.length > 0) {
      locations = await prisma.location.findMany({
        where: { id: { in: accessibleLocations } },
        select: {
          id: true,
          name: true,
        },
        orderBy: {
          name: 'asc',
        },
      })
    }
  } else if (session.user.role === 'PT_MANAGER') {
    // PT managers can see their accessible locations
    const accessibleLocations = await getUserAccessibleLocations(session.user.id, session.user.role)
    if (accessibleLocations && accessibleLocations.length > 0) {
      locations = await prisma.location.findMany({
        where: { id: { in: accessibleLocations } },
        select: {
          id: true,
          name: true,
        },
        orderBy: {
          name: 'asc',
        },
      })
    }
  } else {
    // Admins and PT Managers can see all locations
    locations = await prisma.location.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    })
  }

  return (
    <div className="min-h-screen bg-background-secondary">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary">Create New User</h1>
          <p className="text-sm text-text-secondary mt-1">
            Add a new trainer or staff member to the system
          </p>
        </div>

        <UserForm 
          locations={locations}
          currentUserRole={session.user.role}
        />
      </div>
    </div>
  )
}