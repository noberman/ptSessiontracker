export interface PricingTier {
  id: string
  name: string
  price: number
  interval: 'month' | 'year'
  description: string
  isPopular?: boolean
  features: string[]
  limits: {
    trainers: number | null
    sessions: number | null
    locations: number | null
  }
  ctaText: string
  stripeProductId?: string
  stripePriceId?: string
}

export const PRICING_TIERS: PricingTier[] = [
  {
    id: 'starter',
    name: 'STARTER',
    price: 0,
    interval: 'month',
    description: 'Perfect for getting started',
    features: [
      'Up to 2 trainers',
      '50 sessions per month',
      '1 location',
      'Basic reports',
      'Commission calculations',
      'Excel exports',
      'Email support'
    ],
    limits: {
      trainers: 2,
      sessions: 50,
      locations: 1
    },
    ctaText: 'Get Started',
    stripeProductId: process.env.STRIPE_STARTER_PRODUCT_ID,
    stripePriceId: process.env.STRIPE_STARTER_PRICE_ID
  },
  {
    id: 'growth',
    name: 'GROWTH',
    price: 17,
    interval: 'month',
    description: 'For growing businesses',
    isPopular: true,
    features: [
      'Up to 10 trainers',
      '500 sessions per month',
      'Up to 3 locations',
      'Advanced reports',
      'Commission calculations',
      'Excel exports',
      'Priority email support'
    ],
    limits: {
      trainers: 10,
      sessions: 500,
      locations: 3
    },
    ctaText: 'Start Free Trial',
    stripeProductId: process.env.STRIPE_GROWTH_PRODUCT_ID,
    stripePriceId: process.env.STRIPE_GROWTH_PRICE_ID
  },
  {
    id: 'scale',
    name: 'SCALE',
    price: 37,
    interval: 'month',
    description: 'For established businesses',
    features: [
      'Unlimited trainers',
      'Unlimited sessions',
      'Unlimited locations',
      'Advanced analytics',
      'Commission calculations',
      'Excel exports',
      'Priority phone support'
    ],
    limits: {
      trainers: null,
      sessions: null,
      locations: null
    },
    ctaText: 'Start Free Trial',
    stripeProductId: process.env.STRIPE_SCALE_PRODUCT_ID,
    stripePriceId: process.env.STRIPE_SCALE_PRICE_ID
  }
]

export function getTierByPriceId(priceId: string): PricingTier | undefined {
  return PRICING_TIERS.find(tier => tier.stripePriceId === priceId)
}

export function getTierById(id: string): PricingTier | undefined {
  return PRICING_TIERS.find(tier => tier.id === id)
}