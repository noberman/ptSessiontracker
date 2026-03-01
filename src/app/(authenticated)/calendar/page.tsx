import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { CalendarView } from '@/components/calendar/CalendarView'

export default async function CalendarPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.organizationId) {
    redirect('/dashboard')
  }

  const organization = await prisma.organization.findUnique({
    where: { id: session.user.organizationId },
    select: {
      calendarEnabled: true,
      availabilityEditableBy: true,
    },
  })

  if (!organization) {
    redirect('/dashboard')
  }

  // Determine if user can edit availability
  const role = session.user.role
  const isManager = ['ADMIN', 'PT_MANAGER', 'CLUB_MANAGER'].includes(role)
  const canEdit =
    isManager || (role === 'TRAINER' && organization.availabilityEditableBy === 'MANAGER_AND_TRAINER')

  // Fetch trainers for manager view (or just the current user for trainer view)
  const trainers = isManager
    ? await prisma.user.findMany({
        where: {
          organizationId: session.user.organizationId,
          role: 'TRAINER',
          active: true,
        },
        select: { id: true, name: true, email: true },
        orderBy: { name: 'asc' },
      })
    : [{ id: session.user.id, name: session.user.name ?? session.user.email ?? '', email: session.user.email ?? '' }]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Calendar</h1>
        <p className="text-sm text-text-secondary mt-1">
          View and manage trainer availability
        </p>
      </div>

      {!organization.calendarEnabled ? (
        <div className="rounded-lg border border-border bg-background-secondary p-8 text-center">
          <p className="text-text-secondary mb-2">
            The calendar feature is not enabled for your organization.
          </p>
          {isManager && (
            <a
              href="/settings/calendar"
              className="text-primary hover:text-primary/80 text-sm font-medium"
            >
              Enable it in Settings &rarr;
            </a>
          )}
        </div>
      ) : (
        <CalendarView
          trainers={trainers}
          currentUserId={session.user.id}
          isManager={isManager}
          canEdit={canEdit}
        />
      )}
    </div>
  )
}
