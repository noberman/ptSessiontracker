import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SubscriptionTier } from '@prisma/client'
import { handleSubscriptionDowngrade } from '@/lib/handle-downgrade'

export async function POST(request: Request) {
  try {
    // Check super-admin authentication
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.email !== process.env.SUPER_ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { organizationId, tier } = await request.json()
    
    if (!organizationId || !tier) {
      return NextResponse.json({ error: 'Organization ID and tier required' }, { status: 400 })
    }
    
    // Validate tier
    if (!['FREE', 'GROWTH', 'SCALE'].includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
    }
    
    // Get current organization tier
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { subscriptionTier: true, name: true }
    })
    
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }
    
    const oldTier = org.subscriptionTier
    const newTier = tier as SubscriptionTier
    
    // Update the organization
    const updated = await prisma.organization.update({
      where: { id: organizationId },
      data: { 
        subscriptionTier: newTier,
        // Clear Stripe fields when manually changing tier for testing
        stripeCustomerId: null,
        stripeSubscriptionId: null
      }
    })
    
    // If downgrading, handle the downgrade logic
    if (
      (oldTier === 'SCALE' && newTier !== 'SCALE') ||
      (oldTier === 'GROWTH' && newTier === 'FREE')
    ) {
      await handleSubscriptionDowngrade(organizationId, oldTier, newTier)
    }
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'TIER_CHANGE_MANUAL',
        userId: session.user.id,
        entityType: 'Organization',
        entityId: organizationId,
        oldValue: { tier: oldTier },
        newValue: { tier: newTier }
      }
    })
    
    return NextResponse.json({ 
      success: true, 
      organization: updated,
      message: `Tier changed from ${oldTier} to ${newTier}`
    })
  } catch (error) {
    console.error('Change tier error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to change tier' },
      { status: 500 }
    )
  }
}