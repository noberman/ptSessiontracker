import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { UserForm } from '@/components/users/UserForm'

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  // Get the user to edit with their locations
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      locationId: true,
      active: true,
      locations: {
        select: {
          locationId: true
        }
      }
    },
  })

  if (!user) {
    redirect('/users')
  }

  // Check permissions
  if (session.user.role === 'TRAINER' && user.id !== session.user.id) {
    redirect('/dashboard')
  }

  if (session.user.role === 'CLUB_MANAGER') {
    // Club managers can only edit users in their location or themselves
    const userWithLocation = await prisma.user.findUnique({
      where: { id: user.id },
      select: { 
        locations: {
          select: { locationId: true }
        }
      },
    })
    
    const managerWithLocations = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        locations: {
          select: { locationId: true }
        }
      }
    })
    
    const userLocationIds = userWithLocation?.locations.map(l => l.locationId) || []
    const managerLocationIds = managerWithLocations?.locations.map(l => l.locationId) || []
    const hasSharedLocation = userLocationIds.some(loc => managerLocationIds.includes(loc))
    
    if (!hasSharedLocation && user.id !== session.user.id) {
      redirect('/dashboard')
    }
  }

  // Get locations for the form
  let locations: Array<{ id: string; name: string }> = []
  if (session.user.role === 'CLUB_MANAGER' && session.user.locationId) {
    locations = await prisma.location.findMany({
      where: { 
        id: session.user.locationId,
        active: true
      },
      select: {
        id: true,
        name: true,
      },
    })
  } else if (session.user.role !== 'TRAINER') {
    locations = await prisma.location.findMany({
      where: {
        organizationId: session.user.organizationId,
        active: true,
      },
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
          <h1 className="text-2xl font-bold text-text-primary">Edit User</h1>
          <p className="text-sm text-text-secondary mt-1">
            Update user information and settings
          </p>
        </div>

        <UserForm 
          user={{
            ...user,
            locationId: user.locationId || undefined,
            role: user.role as string,
            locationIds: [
              ...(user.locationId ? [user.locationId] : []), // Include primary location
              ...user.locations.map(l => l.locationId).filter(id => id !== user.locationId) // Add other locations
            ],
          }}
          locations={locations}
          currentUserRole={session.user.role}
        />
      </div>
    </div>
  )
}