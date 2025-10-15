import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { SessionDetailsClient } from './SessionDetailsClient'

export default async function SessionDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  // Fetch session data
  const trainingSession = await prisma.session.findUnique({
    where: { id },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          primaryTrainer: {
            select: {
              id: true,
              name: true,
            }
          }
        }
      },
      trainer: {
        select: {
          id: true,
          name: true,
          email: true,
        }
      },
      location: {
        select: {
          id: true,
          name: true,
        }
      },
      package: {
        select: {
          id: true,
          name: true,
          packageType: true,
          totalSessions: true,
          remainingSessions: true,
        }
      }
    }
  })

  if (!trainingSession) {
    redirect('/sessions')
  }

  // Check permissions
  if (session.user.role === 'TRAINER' && trainingSession.trainerId !== session.user.id) {
    redirect('/sessions')
  }

  if (session.user.role === 'CLUB_MANAGER') {
    // Check if club manager has access to this session's location
    const hasAccess = await prisma.userLocation.findFirst({
      where: {
        userId: session.user.id,
        locationId: trainingSession.locationId
      }
    })
    if (!hasAccess) {
      redirect('/sessions')
    }
  }

  // Determine if user can edit
  const canEdit = 
    (session.user.role === 'ADMIN') ||
    (session.user.role === 'PT_MANAGER') ||
    (session.user.role === 'CLUB_MANAGER') ||  // Already checked access above
    (session.user.role === 'TRAINER' && trainingSession.trainerId === session.user.id && !trainingSession.validated)

  const canDelete = session.user.role === 'ADMIN' || session.user.role === 'PT_MANAGER'

  return (
    <SessionDetailsClient
      session={trainingSession}
      canEdit={canEdit}
      canDelete={canDelete}
    />
  )
}