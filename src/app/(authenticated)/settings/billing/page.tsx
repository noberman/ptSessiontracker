import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { UpgradeButton } from '@/components/billing/UpgradeButton'
import { CheckCircle, CreditCard, Users, Calendar, MapPin } from 'lucide-react'
import { SUBSCRIPTION_TIERS } from '@/lib/stripe'
import Link from 'next/link'
import { BillingNotification } from '@/components/billing/BillingNotification'
import { InvoiceHistory } from '@/components/billing/InvoiceHistory'
import { ManagePaymentButton } from '@/components/billing/ManagePaymentButton'

interface PageProps {
  searchParams: Promise<{ 
    success?: string
    canceled?: string
    session_id?: string
  }>
}

export default async function BillingPage({ searchParams }: PageProps) {
  const params = await searchParams
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/login')
  }

  // Get user with organization
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { organization: true },
  })

  if (!user?.organizationId || !user.organization) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Billing</h1>
          <p className="text-sm text-text-secondary mt-1">
            No organization found
          </p>
        </div>
      </div>
    )
  }

  // Only admins and managers can access billing
  if (user.role !== 'ADMIN' && user.role !== 'PT_MANAGER') {
    redirect('/dashboard')
  }

  const organization = user.organization
  const currentTier = organization.subscriptionTier
  const tierConfig = SUBSCRIPTION_TIERS[currentTier]

  // Get current usage stats for the organization
  const currentMonth = new Date()
  const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
  
  const [trainersCount, sessionsCount, locationsCount] = await Promise.all([
    prisma.user.count({
      where: {
        organizationId: organization.id,
        role: 'TRAINER',
        active: true,
      },
    }),
    prisma.session.count({
      where: {
        trainer: {
          organizationId: organization.id,
        },
        sessionDate: {
          gte: startOfMonth,
        },
      },
    }),
    prisma.location.count({
      where: {
        organizationId: organization.id,
        active: true,
      },
    }),
  ])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Billing & Subscription</h1>
        <p className="text-sm text-text-secondary mt-1">
          Manage your subscription and billing details
        </p>
      </div>

      {/* Success/Cancel Messages */}
      <BillingNotification 
        showSuccess={params.success === 'true'}
        showCanceled={params.canceled === 'true'}
      />

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Current Plan</span>
            <Badge 
              variant={currentTier === 'PRO' ? 'success' : 'gray'} 
              size="sm"
            >
              {tierConfig.name}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-text-secondary" />
              <div>
                <p className="text-sm text-text-secondary">Trainers</p>
                <p className="font-medium">
                  {trainersCount} / {tierConfig.limits.trainers === -1 ? 'Unlimited' : tierConfig.limits.trainers}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-text-secondary" />
              <div>
                <p className="text-sm text-text-secondary">Sessions (This Month)</p>
                <p className="font-medium">
                  {sessionsCount} / {tierConfig.limits.sessionsPerMonth === -1 ? 'Unlimited' : tierConfig.limits.sessionsPerMonth}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-text-secondary" />
              <div>
                <p className="text-sm text-text-secondary">Locations</p>
                <p className="font-medium">
                  {locationsCount} / {tierConfig.limits.locations === -1 ? 'Unlimited' : tierConfig.limits.locations}
                </p>
              </div>
            </div>
          </div>

          {currentTier === 'FREE' && (
            <div className="pt-4 border-t">
              <UpgradeButton className="w-full md:w-auto" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plan Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Plan Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Free Plan */}
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{SUBSCRIPTION_TIERS.FREE.name}</h3>
                <p className="text-2xl font-bold mt-1">$0<span className="text-sm font-normal text-text-secondary">/month</span></p>
              </div>
              <ul className="space-y-2">
                {SUBSCRIPTION_TIERS.FREE.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-success-500 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              {currentTier === 'FREE' && (
                <Badge variant="gray" size="sm">Current Plan</Badge>
              )}
            </div>

            {/* Basic Plan */}
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{SUBSCRIPTION_TIERS.BASIC.name}</h3>
                <p className="text-2xl font-bold mt-1">
                  ${SUBSCRIPTION_TIERS.BASIC.price}
                  <span className="text-sm font-normal text-text-secondary">/month</span>
                </p>
              </div>
              <ul className="space-y-2">
                {SUBSCRIPTION_TIERS.BASIC.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-success-500 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              {currentTier === 'BASIC' ? (
                <Badge variant="success" size="sm">Current Plan</Badge>
              ) : currentTier === 'FREE' ? (
                <UpgradeButton className="w-full" size="sm" tier="BASIC">
                  Upgrade to {SUBSCRIPTION_TIERS.BASIC.name}
                </UpgradeButton>
              ) : null}
            </div>

            {/* Pro Plan */}
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{SUBSCRIPTION_TIERS.PRO.name}</h3>
                <p className="text-2xl font-bold mt-1">
                  ${SUBSCRIPTION_TIERS.PRO.price}
                  <span className="text-sm font-normal text-text-secondary">/month</span>
                </p>
              </div>
              <ul className="space-y-2">
                {SUBSCRIPTION_TIERS.PRO.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-success-500 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              {currentTier === 'PRO' ? (
                <Badge variant="success" size="sm">Current Plan</Badge>
              ) : (
                <UpgradeButton className="w-full" size="sm" tier="PRO">
                  Upgrade to {SUBSCRIPTION_TIERS.PRO.name}
                </UpgradeButton>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Billing Management */}
      {organization.stripeCustomerId && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Payment Method
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-text-secondary">
                Manage your payment methods, view invoices, and update billing details in the Stripe customer portal.
              </p>
              <ManagePaymentButton />
            </CardContent>
          </Card>
          
          {/* Invoice History */}
          <InvoiceHistory />
        </>
      )}

      {/* Back to Settings */}
      <div className="pt-4">
        <Link href="/settings">
          <Button variant="ghost">← Back to Settings</Button>
        </Link>
      </div>
    </div>
  )
}