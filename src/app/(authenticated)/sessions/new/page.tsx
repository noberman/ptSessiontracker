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
    // Get clients where trainer is primary trainer
    myClients = await prisma.client.findMany({
      where: {
        primaryTrainerId: session.user.id,
        active: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
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

    // Get other clients at the same location (for substitute sessions)
    if (session.user.locationId) {
      otherClients = await prisma.client.findMany({
        where: {
          locationId: session.user.locationId,
          primaryTrainerId: { not: session.user.id },
          active: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
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

    clients = [...myClients, ...otherClients]
  } else if (session.user.role === 'CLUB_MANAGER' && session.user.locationId) {
    // Club managers can create sessions for any client at their location
    clients = await prisma.client.findMany({
      where: {
        locationId: session.user.locationId,
        active: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
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
  } else {
    // Admins and PT Managers can see all clients in their organization
    clients = await prisma.client.findMany({
      where: {
        active: true,
        organizationId: session.user.organizationId // Direct filter - much faster!
      },
      select: {
        id: true,
        name: true,
        email: true,
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

  // Get user's location for display
  const userLocation = session.user.locationId ? await prisma.location.findUnique({
    where: { id: session.user.locationId },
    select: { id: true, name: true }
  }) : null

  // Get trainers list for managers/admins
  let trainers: any[] = []
  if (session.user.role !== 'TRAINER') {
    const trainerQuery = session.user.role === 'CLUB_MANAGER' && session.user.locationId
      ? { role: 'TRAINER' as const, locationId: session.user.locationId, active: true, organizationId: session.user.organizationId }
      : { role: 'TRAINER' as const, active: true, organizationId: session.user.organizationId }
    
    trainers = await prisma.user.findMany({
      where: trainerQuery,
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
          userLocation={userLocation}
        />
      </div>
    </div>
  )
}