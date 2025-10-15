'use client'

import { useRouter } from 'next/navigation'
import { PricingCard } from './PricingCard'
import { SUBSCRIPTION_TIERS } from '@/lib/stripe'

export function PricingTable() {
  const router = useRouter()

  // Transform the SUBSCRIPTION_TIERS object into an array with proper structure
  const tiers = Object.entries(SUBSCRIPTION_TIERS).map(([key, config]) => ({
    ...config,
    key,
    displayName: config.name,
  }))

  const handleSelectTier = (tierKey: string) => {
    // For free tier, go straight to signup
    if (tierKey === 'FREE') {
      router.push('/signup')
    } else {
      // For paid tiers, go to signup with tier parameter
      router.push(`/signup?tier=${tierKey.toLowerCase()}`)
    }
  }

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Choose the perfect plan for your fitness business. No hidden fees.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            All plans include a 14-day free trial. No credit card required.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid gap-8 lg:grid-cols-3 lg:gap-6">
          {tiers.map((tier) => (
            <PricingCard
              key={tier.key}
              tier={tier}
              isPopular={tier.key === 'GROWTH'}
              onSelect={() => handleSelectTier(tier.key)}
            />
          ))}
        </div>

        {/* FAQ or Additional Info */}
        <div className="mt-16 text-center">
          <h3 className="text-xl font-semibold mb-4">Frequently Asked Questions</h3>
          <div className="grid gap-6 md:grid-cols-2 text-left max-w-4xl mx-auto">
            <div>
              <h4 className="font-semibold mb-2">Can I change plans later?</h4>
              <p className="text-sm text-muted-foreground">
                Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">What payment methods do you accept?</h4>
              <p className="text-sm text-muted-foreground">
                We accept all major credit cards and debit cards through our secure payment processor, Stripe.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Is there a setup fee?</h4>
              <p className="text-sm text-muted-foreground">
                No setup fees! Just choose your plan and start your free trial immediately.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Can I cancel anytime?</h4>
              <p className="text-sm text-muted-foreground">
                Absolutely! Cancel anytime with no penalties or hidden fees. You&apos;ll have access until the end of your billing period.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}