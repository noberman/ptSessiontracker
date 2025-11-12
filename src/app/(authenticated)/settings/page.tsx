import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { OrganizationForm } from '@/components/settings/OrganizationForm'

export default async function OrganizationSettingsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.organizationId) {
    redirect('/dashboard')
  }

  // Fetch organization details with timezone
  const organization = await prisma.organization.findUnique({
    where: { id: session.user.organizationId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      timezone: true,
      subscriptionTier: true,
      subscriptionStatus: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          users: true,
          locations: true,
          packageTypes: true,
          commissionTiers: true
        }
      }
    }
  })

  if (!organization) {
    redirect('/dashboard')
  }

  // Get usage statistics
  const currentMonth = new Date()
  currentMonth.setDate(1)
  currentMonth.setHours(0, 0, 0, 0)

  const sessionCount = await prisma.session.count({
    where: {
      trainer: {
        organizationId: session.user.organizationId
      },
      createdAt: {
        gte: currentMonth
      }
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Organization Settings</h1>
        <p className="text-sm text-text-secondary mt-1">
          Manage your organization profile and preferences
        </p>
      </div>

      {/* Organization Details */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Organization Profile
        </h2>
        <OrganizationForm organization={organization} />
      </Card>

      {/* Usage Statistics */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Usage Statistics
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-2xl font-bold text-text-primary">
              {organization._count.users}
            </div>
            <div className="text-sm text-text-secondary">Team Members</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-text-primary">
              {organization._count.locations}
            </div>
            <div className="text-sm text-text-secondary">Locations</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-text-primary">
              {sessionCount}
            </div>
            <div className="text-sm text-text-secondary">Sessions This Month</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-text-primary">
              {organization._count.packageTypes}
            </div>
            <div className="text-sm text-text-secondary">Package Types</div>
          </div>
        </div>
      </Card>
    </div>
  )
}