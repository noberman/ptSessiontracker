import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PackageForm } from '@/components/packages/PackageForm'

export default async function NewPackagePage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>
}) {
  const params = await searchParams
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  // Trainers cannot create packages
  if (session.user.role === 'TRAINER') {
    redirect('/packages')
  }

  const preselectedClientId = params.clientId

  // Get clients for the form
  let clients = []
  
  if (session.user.role === 'CLUB_MANAGER' && session.user.locationId) {
    // Club managers can only see clients at their location
    clients = await prisma.client.findMany({
      where: {
        locationId: session.user.locationId,
        active: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: { name: 'asc' },
    })
  } else {
    // Admins and PT Managers can see all clients
    clients = await prisma.client.findMany({
      where: {
        active: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: { name: 'asc' },
    })
  }

  return (
    <div className="min-h-screen bg-background-secondary">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary">Create New Package</h1>
          <p className="text-sm text-text-secondary mt-1">
            Add a training package for a client
          </p>
        </div>

        <PackageForm 
          clients={clients}
          preselectedClientId={preselectedClientId}
          currentUserRole={session.user.role}
        />
      </div>
    </div>
  )
}