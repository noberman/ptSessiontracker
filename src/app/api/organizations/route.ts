import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SubscriptionTier, SubscriptionStatus } from '@prisma/client'

// GET /api/organizations - List all organizations (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Only admins can list all organizations
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const organizations = await prisma.organization.findMany({
      orderBy: { createdAt: 'desc' }
    })
    
    return NextResponse.json(organizations)
  } catch (error: any) {
    console.error('Failed to fetch organizations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch organizations' },
      { status: 500 }
    )
  }
}

// POST /api/organizations - Create new organization
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Only admins can create organizations
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const body = await request.json()
    
    // Validate required fields
    if (!body.name || !body.email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      )
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }
    
    // Validate name length
    if (body.name.length < 2) {
      return NextResponse.json(
        { error: 'Organization name must be at least 2 characters' },
        { status: 400 }
      )
    }
    
    // Validate phone if provided
    if (body.phone && body.phone.length < 7) {
      return NextResponse.json(
        { error: 'Invalid phone number' },
        { status: 400 }
      )
    }
    
    // Validate subscription tier if provided
    const validTiers = Object.values(SubscriptionTier)
    if (body.subscriptionTier && !validTiers.includes(body.subscriptionTier)) {
      return NextResponse.json(
        { error: 'Invalid subscription tier' },
        { status: 400 }
      )
    }
    
    // Validate subscription status if provided
    const validStatuses = Object.values(SubscriptionStatus)
    if (body.subscriptionStatus && !validStatuses.includes(body.subscriptionStatus)) {
      return NextResponse.json(
        { error: 'Invalid subscription status' },
        { status: 400 }
      )
    }
    
    // Check for duplicate email
    const existingOrg = await prisma.organization.findFirst({
      where: { email: body.email }
    })
    
    if (existingOrg) {
      return NextResponse.json(
        { error: 'Organization with this email already exists' },
        { status: 409 }
      )
    }
    
    const organization = await prisma.organization.create({
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone,
        subscriptionTier: body.subscriptionTier || SubscriptionTier.FREE,
        subscriptionStatus: body.subscriptionStatus || SubscriptionStatus.ACTIVE,
        stripeCustomerId: body.stripeCustomerId,
        stripeSubscriptionId: body.stripeSubscriptionId
      }
    })
    
    return NextResponse.json(organization, { status: 201 })
  } catch (error: any) {
    console.error('Failed to create organization:', error)
    return NextResponse.json(
      { error: 'Failed to create organization' },
      { status: 500 }
    )
  }
}