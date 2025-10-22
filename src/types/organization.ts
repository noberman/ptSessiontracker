export interface Organization {
  id: string
  name: string
  email: string
  phone?: string | null
  subscriptionTier: 'FREE' | 'GROWTH' | 'SCALE'
  subscriptionStatus: 'ACTIVE' | 'CANCELED' | 'PAST_DUE'
  stripeCustomerId?: string | null
  stripeSubscriptionId?: string | null
  createdAt: Date
  updatedAt: Date
}

export type SubscriptionTier = 'FREE' | 'GROWTH' | 'SCALE'
export type SubscriptionStatus = 'ACTIVE' | 'CANCELED' | 'PAST_DUE'

export interface CreateOrganizationInput {
  name: string
  email: string
  phone?: string
  subscriptionTier?: SubscriptionTier
  subscriptionStatus?: SubscriptionStatus
  stripeCustomerId?: string
  stripeSubscriptionId?: string
}

export interface UpdateOrganizationInput {
  name?: string
  email?: string
  phone?: string | null
  subscriptionTier?: SubscriptionTier
  subscriptionStatus?: SubscriptionStatus
  stripeCustomerId?: string | null
  stripeSubscriptionId?: string | null
}