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
    name: 'Starter',
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
      'Commission calculations',
      'Excel exports',
      'Email support',
    ],
  },
  GROWTH: {
    name: 'Growth',
    price: 17,
    priceId: process.env.STRIPE_GROWTH_PRICE_ID,
    limits: {
      trainers: 10,
      sessionsPerMonth: 500,
      locations: 3,
    },
    features: [
      'Up to 10 trainers',
      '500 sessions per month',
      'Up to 3 locations',
      'Advanced reports',
      'Priority email support',
      'Commission calculations',
      'Excel exports',
    ],
  },
  SCALE: {
    name: 'Scale',
    price: 37,
    priceId: process.env.STRIPE_SCALE_PRICE_ID,
    limits: {
      trainers: -1, // unlimited
      sessionsPerMonth: -1, // unlimited
      locations: -1, // unlimited
    },
    features: [
      'Unlimited trainers',
      'Unlimited sessions',
      'Unlimited locations',
      'Advanced analytics',
      'Priority phone support',
      'Commission calculations',
      'Excel exports',
    ],
  },
} as const

export type SubscriptionTierKey = keyof typeof SUBSCRIPTION_TIERS