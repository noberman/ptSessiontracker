import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SubscriptionTier, SubscriptionStatus } from '@prisma/client'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/organizations/[id] - Get organization details
export async function GET(request: NextRequest, props: RouteParams) {
  const params = await props.params
  
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Only admins can view organization details (for now)
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const organization = await prisma.organization.findUnique({
      where: { id: params.id }
    })
    
    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }
    
    return NextResponse.json(organization)
  } catch (error: any) {
    console.error('Failed to fetch organization:', error)
    return NextResponse.json(
      { error: 'Failed to fetch organization' },
      { status: 500 }
    )
  }
}

// PUT /api/organizations/[id] - Update organization
export async function PUT(request: NextRequest, props: RouteParams) {
  const params = await props.params
  
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Only admins can update organizations
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const body = await request.json()
    
    // Check if organization exists
    const existingOrg = await prisma.organization.findUnique({
      where: { id: params.id }
    })
    
    if (!existingOrg) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }
    
    // Validate email format if provided
    if (body.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(body.email)) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        )
      }
    }
    
    // Validate name length if provided
    if (body.name && body.name.length < 2) {
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
    if (body.subscriptionTier) {
      const validTiers = Object.values(SubscriptionTier)
      if (!validTiers.includes(body.subscriptionTier)) {
        return NextResponse.json(
          { error: 'Invalid subscription tier' },
          { status: 400 }
        )
      }
    }
    
    // Validate subscription status if provided
    if (body.subscriptionStatus) {
      const validStatuses = Object.values(SubscriptionStatus)
      if (!validStatuses.includes(body.subscriptionStatus)) {
        return NextResponse.json(
          { error: 'Invalid subscription status' },
          { status: 400 }
        )
      }
    }
    
    // Check for duplicate email if email is being changed
    if (body.email && body.email !== existingOrg.email) {
      const duplicateOrg = await prisma.organization.findFirst({
        where: { 
          email: body.email,
          NOT: { id: params.id }
        }
      })
      
      if (duplicateOrg) {
        return NextResponse.json(
          { error: 'Organization with this email already exists' },
          { status: 409 }
        )
      }
    }
    
    const organization = await prisma.organization.update({
      where: { id: params.id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.email && { email: body.email }),
        ...(body.phone !== undefined && { phone: body.phone }),
        ...(body.subscriptionTier && { subscriptionTier: body.subscriptionTier }),
        ...(body.subscriptionStatus && { subscriptionStatus: body.subscriptionStatus }),
        ...(body.stripeCustomerId !== undefined && { stripeCustomerId: body.stripeCustomerId }),
        ...(body.stripeSubscriptionId !== undefined && { stripeSubscriptionId: body.stripeSubscriptionId })
      }
    })
    
    return NextResponse.json(organization)
  } catch (error: any) {
    console.error('Failed to update organization:', error)
    return NextResponse.json(
      { error: 'Failed to update organization' },
      { status: 500 }
    )
  }
}

// DELETE /api/organizations/[id] - Soft delete (set status to CANCELED)
export async function DELETE(request: NextRequest, props: RouteParams) {
  const params = await props.params
  
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Only admins can delete organizations
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Check if organization exists
    const existingOrg = await prisma.organization.findUnique({
      where: { id: params.id }
    })
    
    if (!existingOrg) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }
    
    // Soft delete - just set status to CANCELED
    const organization = await prisma.organization.update({
      where: { id: params.id },
      data: {
        subscriptionStatus: SubscriptionStatus.CANCELED
      }
    })
    
    return NextResponse.json({
      message: 'Organization canceled successfully',
      organization
    })
  } catch (error: any) {
    console.error('Failed to delete organization:', error)
    return NextResponse.json(
      { error: 'Failed to delete organization' },
      { status: 500 }
    )
  }
}