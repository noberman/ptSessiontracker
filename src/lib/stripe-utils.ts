import { stripe } from './stripe'
import { prisma } from './prisma'
import Stripe from 'stripe'

/**
 * Get product-specific statement descriptor
 * This allows Flobit to have different descriptors for different products
 */
export function getStatementDescriptor(productName: 'fitsync' | 'other-product' = 'fitsync'): string {
  const descriptors = {
    'fitsync': 'FITSYNC',
    'other-product': 'OTHERPROD',
    // Add more products as Flobit grows
  }
  
  return descriptors[productName] || 'FLOBIT'
}

/**
 * Create a Stripe customer for an organization
 */
export async function createStripeCustomer(
  email: string,
  name: string,
  organizationId: string
): Promise<string> {
  try {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        organizationId,
        environment: process.env.NODE_ENV || 'development',
        createdFrom: 'FitSync',
      },
    })
    
    console.log(`Created Stripe customer ${customer.id} for organization ${organizationId}`)
    return customer.id
  } catch (error) {
    console.error('Failed to create Stripe customer:', error)
    throw error
  }
}

/**
 * Update a Stripe customer's information
 */
export async function updateStripeCustomer(
  customerId: string,
  updates: Stripe.CustomerUpdateParams
): Promise<Stripe.Customer> {
  try {
    const customer = await stripe.customers.update(customerId, updates)
    console.log(`Updated Stripe customer ${customerId}`)
    return customer
  } catch (error) {
    console.error('Failed to update Stripe customer:', error)
    throw error
  }
}

/**
 * Get a Stripe customer by ID
 */
export async function getStripeCustomer(customerId: string): Promise<Stripe.Customer> {
  try {
    const customer = await stripe.customers.retrieve(customerId)
    
    if (customer.deleted) {
      throw new Error('Customer has been deleted')
    }
    
    return customer as Stripe.Customer
  } catch (error) {
    console.error('Failed to retrieve Stripe customer:', error)
    throw error
  }
}

/**
 * Create or get Stripe customer for an organization
 * This ensures we always have a customer ID for an org
 */
export async function ensureStripeCustomer(organizationId: string): Promise<string> {
  try {
    // Get the organization
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
    })
    
    if (!organization) {
      throw new Error('Organization not found')
    }
    
    // If already has a customer ID, verify it exists
    if (organization.stripeCustomerId) {
      try {
        const customer = await getStripeCustomer(organization.stripeCustomerId)
        if (customer) {
          return organization.stripeCustomerId
        }
      } catch (error) {
        console.log('Existing customer not found, creating new one')
      }
    }
    
    // Create new customer
    const customerId = await createStripeCustomer(
      organization.email,
      organization.name,
      organization.id
    )
    
    // Update organization with customer ID
    await prisma.organization.update({
      where: { id: organizationId },
      data: { stripeCustomerId: customerId },
    })
    
    return customerId
  } catch (error) {
    console.error('Failed to ensure Stripe customer:', error)
    throw error
  }
}

/**
 * Get or create a billing portal session for customer management
 */
export async function createBillingPortalSession(
  customerId: string,
  returnUrl: string
): Promise<string> {
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    })
    
    console.log('Portal session created:', {
      id: session.id,
      url: session.url,
      created: session.created,
    })
    
    // Ensure we have a full URL
    if (!session.url.startsWith('http')) {
      // If it's a relative URL, prepend the Stripe billing portal domain
      return `https://billing.stripe.com${session.url}`
    }
    
    return session.url
  } catch (error) {
    console.error('Failed to create billing portal session:', error)
    throw error
  }
}

/**
 * Get subscription for a customer
 */
export async function getCustomerSubscription(
  customerId: string
): Promise<Stripe.Subscription | null> {
  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    })
    
    return subscriptions.data[0] || null
  } catch (error) {
    console.error('Failed to get customer subscription:', error)
    return null
  }
}

/**
 * Cancel a subscription at period end
 */
export async function cancelSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    })
    
    console.log(`Subscription ${subscriptionId} set to cancel at period end`)
    return subscription
  } catch (error) {
    console.error('Failed to cancel subscription:', error)
    throw error
  }
}

/**
 * Reactivate a subscription that was set to cancel
 */
export async function reactivateSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    })
    
    console.log(`Subscription ${subscriptionId} reactivated`)
    return subscription
  } catch (error) {
    console.error('Failed to reactivate subscription:', error)
    throw error
  }
}