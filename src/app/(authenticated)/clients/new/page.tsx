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

  if (session.user.role === 'CLUB_MANAGER' || session.user.role === 'PT_MANAGER') {
    // Club managers and PT Managers only see their accessible locations and trainers
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        locations: {
          select: { locationId: true }
        }
      }
    })
    
    // Collect all accessible location IDs from UserLocation table
    const accessibleLocationIds: string[] = []
    if (user?.locations) {
      accessibleLocationIds.push(...user.locations.map(l => l.locationId))
    }
    
    if (accessibleLocationIds.length > 0) {
      locations = await prisma.location.findMany({
        where: { 
          id: { in: accessibleLocationIds },
          active: true
        },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
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
    }
  } else {
    // Only Admins can see all locations and trainers in their organization
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