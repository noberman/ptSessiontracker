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

      // Update user with organization and make them admin
      // Need to find the user by ID since email is not unique
      const userToUpdate = await tx.user.findFirst({
        where: { email: session.user.email! }
      })
      
      if (!userToUpdate) {
        throw new Error('User not found')
      }
      
      const user = await tx.user.update({
        where: { id: userToUpdate.id },
        data: {
          organizationId: organization.id,
          locationId: location.id,
          role: 'ADMIN',
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
  } catch (error: any) {
    console.error('Organization setup error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create organization' },
      { status: 500 }
    )
  }
}