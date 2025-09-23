import Stripe from 'stripe'

// Lazy initialization to avoid errors during build
let stripeInstance: Stripe | null = null

export function getStripe(): Stripe {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set in environment variables')
    }
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-08-27.basil',
      typescript: true,
    })
  }
  return stripeInstance
}

// For backward compatibility, export a proxy that initializes on first use
export const stripe = new Proxy({} as Stripe, {
  get(target, prop, receiver) {
    const instance = getStripe()
    return Reflect.get(instance, prop, receiver)
  },
})

// Subscription configuration
export const SUBSCRIPTION_TIERS = {
  FREE: {
    name: 'Free',
    price: 0,
    limits: {
      trainers: 2,
      sessionsPerMonth: 50,
      locations: 1,
    },
    features: [
      'Up to 2 trainers',
      '50 sessions per month',
      '1 location',
      'Basic reports',
      'Email support',
    ],
  },
  PRO: {
    name: 'Professional',
    price: 15,
    priceId: process.env.STRIPE_PRO_PRICE_ID,
    limits: {
      trainers: -1, // unlimited
      sessionsPerMonth: -1, // unlimited
      locations: -1, // unlimited
    },
    features: [
      'Unlimited trainers',
      'Unlimited sessions',
      'Unlimited locations',
      'Advanced reports',
      'Priority support',
      'Commission calculations',
      'Excel exports',
      'Custom branding (coming soon)',
    ],
  },
} as const

export type SubscriptionTierKey = keyof typeof SUBSCRIPTION_TIERS