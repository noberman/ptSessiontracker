import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ClientForm } from '@/components/clients/ClientForm'

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  // Trainers cannot edit clients
  if (session.user.role === 'TRAINER') {
    redirect('/clients')
  }

  // Get the client to edit
  const client = await prisma.client.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      locationId: true,
      primaryTrainerId: true,
      active: true,
    },
  })

  if (!client) {
    redirect('/clients')
  }

  // Check permissions for club managers
  if (session.user.role === 'CLUB_MANAGER') {
    const manager = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { locations: true }
    })
    
    const hasAccess = manager?.locations.some(l => l.locationId === client.locationId)
    if (!hasAccess) {
      redirect('/clients')
    }
  }

  // Get locations and trainers for the form
  let locations: Array<{ id: string; name: string }> = []
  let trainers: Array<{ id: string; name: string; email: string; locationId?: string | null }> = []

  if (session.user.role === 'CLUB_MANAGER') {
    const manager = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { locations: true }
    })
    
    const accessibleLocationIds = manager?.locations.map(l => l.locationId) || []
    
    locations = await prisma.location.findMany({
      where: { 
        id: { in: accessibleLocationIds },
        active: true
      },
      select: { id: true, name: true },
    })
    
    trainers = await prisma.user.findMany({
      where: {
        role: { in: ['TRAINER', 'PT_MANAGER'] },
        active: true,
        organizationId: session.user.organizationId,
        locations: {
          some: {
            locationId: { in: accessibleLocationIds }
          }
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        locationId: true,
        locations: {
          select: {
            locationId: true
          }
        }
      },
      orderBy: { name: 'asc' },
    })
  } else {
    [locations, trainers] = await Promise.all([
      prisma.location.findMany({
        where: { 
          organizationId: session.user.organizationId,
          active: true
        },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      prisma.user.findMany({
        where: {
          role: { in: ['TRAINER', 'PT_MANAGER'] },
          active: true,
          organizationId: session.user.organizationId,
        },
        select: {
          id: true,
          name: true,
          email: true,
          locationId: true,
          locations: {
            select: {
              locationId: true
            }
          }
        },
        orderBy: { name: 'asc' },
      }),
    ])
  }

  return (
    <div className="min-h-screen bg-background-secondary">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary">Edit Client</h1>
          <p className="text-sm text-text-secondary mt-1">
            Update client information
          </p>
        </div>

        <ClientForm 
          client={client}
          locations={locations}
          trainers={trainers as any}
          currentUserRole={session.user.role}
        />
      </div>
    </div>
  )
}