import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ClientForm } from '@/components/clients/ClientForm'

export default async function NewClientPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  // Trainers cannot create clients
  if (session.user.role === 'TRAINER') {
    redirect('/clients')
  }

  // Get locations and trainers for the form
  let locations: Array<{ id: string; name: string }> = []
  let trainers: Array<{ id: string; name: string; email: string; locationId?: string | null }> = []

  if (session.user.role === 'CLUB_MANAGER' && session.user.locationId) {
    // Club managers can only see their location and trainers
    locations = await prisma.location.findMany({
      where: { id: session.user.locationId },
      select: { id: true, name: true },
    })
    
    trainers = await prisma.user.findMany({
      where: {
        role: 'TRAINER',
        active: true,
        locationId: session.user.locationId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        locationId: true,
      },
      orderBy: { name: 'asc' },
    })
  } else {
    // Admins and PT Managers can see all locations and trainers
    [locations, trainers] = await Promise.all([
      prisma.location.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      prisma.user.findMany({
        where: {
          role: 'TRAINER',
          active: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
          locationId: true,
        },
        orderBy: { name: 'asc' },
      }),
    ])
  }

  return (
    <div className="min-h-screen bg-background-secondary">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary">Create New Client</h1>
          <p className="text-sm text-text-secondary mt-1">
            Add a new client to the system
          </p>
        </div>

        <ClientForm 
          locations={locations}
          trainers={trainers as any}
          currentUserRole={session.user.role}
        />
      </div>
    </div>
  )
}