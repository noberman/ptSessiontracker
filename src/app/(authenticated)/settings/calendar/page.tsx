import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { CalendarSettingsForm } from '@/components/settings/CalendarSettingsForm'

export default async function CalendarSettingsPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.organizationId) {
    redirect('/dashboard')
  }

  const organization = await prisma.organization.findUnique({
    where: { id: session.user.organizationId },
    select: {
      id: true,
      availabilityEditableBy: true,
    },
  })

  if (!organization) {
    redirect('/dashboard')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Calendar Settings</h1>
        <p className="text-sm text-text-secondary mt-1">
          Configure calendar features and availability permissions
        </p>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Calendar Configuration
        </h2>
        <CalendarSettingsForm
          organizationId={organization.id}
          availabilityEditableBy={organization.availabilityEditableBy}
        />
      </Card>
    </div>
  )
}
