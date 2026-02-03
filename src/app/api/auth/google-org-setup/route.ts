import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getStripe } from '@/lib/stripe'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user already has an organization
    // Using findFirst since email is not globally unique
    const existingUser = await prisma.user.findFirst({
      where: { email: session.user.email },
      include: { organization: true }
    })

    if (existingUser?.organizationId) {
      return NextResponse.json({ 
        error: 'User already belongs to an organization' 
      }, { status: 400 })
    }

    const { organizationName, locationName } = await request.json()

    if (!organizationName || !locationName) {
      return NextResponse.json({ 
        error: 'Organization name and location are required' 
      }, { status: 400 })
    }

    // Create everything in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create new organization for the user
      const organization = await tx.organization.create({
        data: {
          name: organizationName,
          email: session.user.email!,
          subscriptionTier: 'FREE',
          subscriptionStatus: 'ACTIVE',
          commissionMethod: 'PROGRESSIVE'
        }
      })

      // Create location
      const location = await tx.location.create({
        data: {
          organizationId: organization.id,
          name: locationName,
        },
      })

      // For Google OAuth, we always create a NEW user for the NEW organization
      // This is because the same email can belong to multiple organizations
      // Each org+email combination is a separate user account
      const { hash } = await import('bcryptjs')
      const randomPassword = Math.random().toString(36).slice(-12) // They'll use Google OAuth, not password
      
      const user = await tx.user.create({
        data: {
          email: session.user.email!,
          name: session.user.name || 'Admin',
          password: await hash(randomPassword, 10), // Required field but won't be used with OAuth
          organizationId: organization.id,
          role: 'ADMIN',
          active: true,
          onboardingCompletedAt: new Date(),
        },
      })

      // Add user to location through UserLocation junction table
      await tx.userLocation.create({
        data: {
          userId: user.id,
          locationId: location.id,
        },
      })

      // Create default commission tiers
      await tx.commissionTier.createMany({
        data: [
          { minSessions: 1, maxSessions: 10, percentage: 0.4 },
          { minSessions: 11, maxSessions: 20, percentage: 0.5 },
          { minSessions: 21, maxSessions: null, percentage: 0.6 },
        ],
      })

      // Create Stripe customer if in production
      if (process.env.NODE_ENV === 'production' && process.env.STRIPE_SECRET_KEY) {
        try {
          const stripe = getStripe()
          const customer = await stripe.customers.create({
            email: session.user.email!,  // We checked for email existence above
            name: session.user.name || organizationName,
            metadata: {
              organizationId: organization.id,
              userId: user.id
            }
          })

          await tx.organization.update({
            where: { id: organization.id },
            data: { stripeCustomerId: customer.id }
          })
        } catch (stripeError) {
          console.error('Stripe customer creation failed:', stripeError)
          // Continue without Stripe in case of error
        }
      }

      return {
        organization,
        location,
        user
      }
    })

    return NextResponse.json({
      message: 'Organization created successfully',
      organizationId: result.organization.id,
      locationId: result.location.id
    })
  } catch (error: unknown) {
    console.error('Organization setup error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create organization' },
      { status: 500 }
    )
  }
}