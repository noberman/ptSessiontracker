import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { SessionEditForm } from '@/components/sessions/SessionEditForm'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'

export default async function EditSessionPage({
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
        }
      }
    }
  })

  if (!trainingSession) {
    redirect('/sessions')
  }

  // Check permissions
  const canEdit = 
    (session.user.role === 'ADMIN') ||
    (session.user.role === 'PT_MANAGER') ||
    (session.user.role === 'CLUB_MANAGER' && session.user.locationId === trainingSession.locationId) ||
    (session.user.role === 'TRAINER' && trainingSession.trainerId === session.user.id && !trainingSession.validated)

  if (!canEdit) {
    redirect(`/sessions/${id}`)
  }

  // Determine what fields can be edited based on role
  const canEditDate = session.user.role === 'ADMIN' || session.user.role === 'PT_MANAGER'
  const canEditValidation = session.user.role === 'ADMIN' // Only admins can manually change validation

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Edit Session</h1>
          <p className="text-sm text-text-secondary mt-1">
            Update session details for {trainingSession.client.name}
          </p>
        </div>
        <div className="flex space-x-2">
          <Link href={`/sessions/${id}`}>
            <Button variant="outline">Cancel</Button>
          </Link>
        </div>
      </div>

      <SessionEditForm
        session={trainingSession}
        currentUserRole={session.user.role}
        canEditDate={canEditDate}
        canEditValidation={canEditValidation}
      />
    </div>
  )
}