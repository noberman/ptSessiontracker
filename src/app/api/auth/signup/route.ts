import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { createStripeCustomer } from '@/lib/stripe-utils'
import { Role, SubscriptionTier } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { organizationName, adminName, adminEmail, password } = body

    // Validate required fields
    if (!organizationName || !adminName || !adminEmail || !password) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(adminEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate password strength (at least 8 chars)
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      )
    }

    // Check if organization name already exists
    const existingOrg = await prisma.organization.findFirst({
      where: {
        name: {
          equals: organizationName,
          mode: 'insensitive'
        }
      }
    })

    if (existingOrg) {
      return NextResponse.json(
        { error: 'An organization with this name already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await hash(password, 12)

    // Create organization, admin user, and location in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create organization (FREE tier by default)
      const organization = await tx.organization.create({
        data: {
          name: organizationName,
          email: adminEmail,
          subscriptionTier: SubscriptionTier.FREE,
          subscriptionStatus: 'ACTIVE',
          commissionMethod: 'PROGRESSIVE', // Default commission method
        }
      })

      // 2. Create default location with org-specific name
      const location = await tx.location.create({
        data: {
          name: `${organizationName} - Main Location`, // Make it unique per org
          organizationId: organization.id,
          active: true,
        }
      })

      // 3. Create admin user
      const user = await tx.user.create({
        data: {
          email: adminEmail,
          name: adminName,
          password: hashedPassword,
          role: Role.ADMIN,
          organizationId: organization.id,
          locationId: location.id,
          active: true,
        }
      })

      // Don't create commission tiers - let onboarding handle it
      // This ensures users go through the proper onboarding flow

      return { organization, user, location }
    })

    // Create Stripe customer (non-blocking, in background)
    try {
      const stripeCustomerId = await createStripeCustomer(
        adminEmail,
        organizationName,
        result.organization.id
      )
      
      // Update organization with Stripe customer ID
      await prisma.organization.update({
        where: { id: result.organization.id },
        data: { stripeCustomerId }
      })
    } catch (stripeError) {
      // Log but don't fail signup if Stripe fails
      console.error('Failed to create Stripe customer:', stripeError)
    }

    // Log the signup
    await prisma.auditLog.create({
      data: {
        userId: result.user.id,
        action: 'ORGANIZATION_CREATED',
        entityType: 'Organization',
        entityId: result.organization.id,
        newValue: {
          organizationName,
          adminEmail,
          adminName,
        }
      }
    })

    return NextResponse.json({
      success: true,
      organizationId: result.organization.id,
      userId: result.user.id,
      message: 'Account created successfully'
    })

  } catch (error: any) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Failed to create account. Please try again.' },
      { status: 500 }
    )
  }
}