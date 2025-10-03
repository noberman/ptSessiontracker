import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { SessionForm } from '@/components/sessions/SessionForm'

export default async function NewSessionPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>
}) {
  const params = await searchParams
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  const preselectedClientId = params.clientId

  // Get clients based on user role and location
  let clients: any[] = []
  let myClients: any[] = []
  let otherClients: any[] = []
  
  if (session.user.role === 'TRAINER') {
    // Get trainer's accessible locations (both old locationId and new UserLocation records)
    const trainer = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        locationId: true,
        locations: {
          select: { locationId: true }
        }
      }
    })
    
    // Collect all accessible location IDs
    const accessibleLocationIds: string[] = []
    if (trainer?.locationId) {
      accessibleLocationIds.push(trainer.locationId)
    }
    if (trainer?.locations) {
      accessibleLocationIds.push(...trainer.locations.map(l => l.locationId))
    }
    
    // Get all clients at trainer's accessible locations
    if (accessibleLocationIds.length > 0) {
      clients = await prisma.client.findMany({
        where: {
          locationId: { in: accessibleLocationIds },
          active: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
          locationId: true,
          primaryTrainerId: true,  // Need this for filtering
          location: {
            select: {
              id: true,
              name: true
            }
          },
          packages: {
            where: { active: true },
            select: {
              id: true,
              name: true,
              packageType: true,
              remainingSessions: true,
              totalSessions: true,
              expiresAt: true,
            }
          }
        },
        orderBy: { name: 'asc' },
      })
      
      // Separate into "my clients" (assigned to me) and "other clients" (at my locations but not assigned to me)
      myClients = clients.filter(c => c.primaryTrainerId === session.user.id)
      otherClients = clients.filter(c => c.primaryTrainerId !== session.user.id)
    } else {
      // Fallback: if no locations set, just show directly assigned clients
      myClients = await prisma.client.findMany({
        where: {
          primaryTrainerId: session.user.id,
          active: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
          locationId: true,
          location: {
            select: {
              id: true,
              name: true
            }
          },
          packages: {
            where: { active: true },
            select: {
              id: true,
              name: true,
              packageType: true,
              remainingSessions: true,
              totalSessions: true,
              expiresAt: true,
            }
          }
        },
        orderBy: { name: 'asc' },
      })
      clients = myClients
    }
  } else if (session.user.role === 'CLUB_MANAGER' || session.user.role === 'PT_MANAGER') {
    // Club managers and PT Managers see clients at their accessible locations
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        locationId: true,
        locations: {
          select: { locationId: true }
        }
      }
    })
    
    // Collect all accessible location IDs
    const accessibleLocationIds: string[] = []
    if (user?.locationId) {
      accessibleLocationIds.push(user.locationId)
    }
    if (user?.locations) {
      accessibleLocationIds.push(...user.locations.map(l => l.locationId))
    }
    
    if (accessibleLocationIds.length > 0) {
      clients = await prisma.client.findMany({
        where: {
          locationId: { in: accessibleLocationIds },
          active: true,
        },
      select: {
        id: true,
        name: true,
        email: true,
        locationId: true,
        location: {
          select: {
            id: true,
            name: true
          }
        },
        packages: {
          where: { active: true },
          select: {
            id: true,
            name: true,
            packageType: true,
            remainingSessions: true,
            totalSessions: true,
            expiresAt: true,
          }
        }
      },
      orderBy: { name: 'asc' },
    })
    }
  } else {
    // Only Admins can see all clients in their organization
    clients = await prisma.client.findMany({
      where: {
        active: true,
        organizationId: session.user.organizationId // Direct filter - much faster!
      },
      select: {
        id: true,
        name: true,
        email: true,
        locationId: true,
        location: {
          select: {
            id: true,
            name: true
          }
        },
        packages: {
          where: { active: true },
          select: {
            id: true,
            name: true,
            packageType: true,
            remainingSessions: true,
            totalSessions: true,
            expiresAt: true,
          }
        }
      },
      orderBy: { name: 'asc' },
    })
  }

  // Get trainers list for managers/admins
  let trainers: any[] = []
  if (session.user.role !== 'TRAINER') {
    // For PT Managers and Club Managers, filter by accessible locations
    if (session.user.role === 'PT_MANAGER' || session.user.role === 'CLUB_MANAGER') {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          locationId: true,
          locations: {
            select: { locationId: true }
          }
        }
      })
      
      // Collect all accessible location IDs
      const accessibleLocationIds: string[] = []
      if (user?.locationId) {
        accessibleLocationIds.push(user.locationId)
      }
      if (user?.locations) {
        accessibleLocationIds.push(...user.locations.map(l => l.locationId))
      }
      
      if (accessibleLocationIds.length > 0) {
        trainers = await prisma.user.findMany({
          where: {
            role: { in: ['TRAINER', 'PT_MANAGER'] },
            active: true,
            organizationId: session.user.organizationId,
            OR: [
              { locationId: { in: accessibleLocationIds } },
              { 
                locations: {
                  some: {
                    locationId: { in: accessibleLocationIds }
                  }
                }
              }
            ]
          },
          select: {
            id: true,
            name: true,
            email: true,
          },
          orderBy: { name: 'asc' },
        })
      }
    } else {
      // Admins see all trainers
      trainers = await prisma.user.findMany({
        where: {
          role: { in: ['TRAINER', 'PT_MANAGER'] },
          active: true,
          organizationId: session.user.organizationId,
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
        orderBy: { name: 'asc' },
      })
    }
  }

  return (
    <div className="min-h-screen bg-background-secondary">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary">Log New Session</h1>
          <p className="text-sm text-text-secondary mt-1">
            Record a completed training session
          </p>
        </div>

        <SessionForm 
          clients={clients}
          myClients={myClients}
          otherClients={otherClients}
          trainers={trainers}
          preselectedClientId={preselectedClientId}
          currentUserRole={session.user.role}
          currentUserId={session.user.id}
        />
      </div>
    </div>
  )
}