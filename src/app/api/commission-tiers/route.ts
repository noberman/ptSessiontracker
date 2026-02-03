import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ensureCommissionTiers } from '@/lib/commission/ensure-tiers'

// GET /api/commission-tiers - Get commission tiers for organization
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Ensure default tiers exist if none are configured
    await ensureCommissionTiers(session.user.organizationId)

    // Fetch tiers for the organization
    const tiers = await prisma.commissionTier.findMany({
      where: { organizationId: session.user.organizationId },
      orderBy: { minSessions: 'asc' }
    })

    return NextResponse.json(tiers)
  } catch (error: unknown) {
    console.error('Failed to fetch commission tiers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch commission tiers' },
      { status: 500 }
    )
  }
}

// PUT /api/commission-tiers - Update commission tiers
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins and PT managers can update tiers
    if (!['ADMIN', 'PT_MANAGER', 'CLUB_MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const tiers = body as Array<{
      id?: string
      minSessions: number
      maxSessions: number | null
      commissionPercentage: number
    }>

    // Validate tiers
    if (!Array.isArray(tiers) || tiers.length === 0) {
      return NextResponse.json(
        { error: 'At least one tier is required' },
        { status: 400 }
      )
    }

    // Delete existing tiers for the organization
    await prisma.commissionTier.deleteMany({
      where: { organizationId: session.user.organizationId }
    })

    // Create new tiers
    const createdTiers = await prisma.commissionTier.createMany({
      data: tiers.map((tier) => ({
        organizationId: session.user.organizationId!,
        minSessions: tier.minSessions,
        maxSessions: tier.maxSessions,
        percentage: tier.commissionPercentage
      }))
    })

    // Fetch and return the created tiers
    const newTiers = await prisma.commissionTier.findMany({
      where: { organizationId: session.user.organizationId },
      orderBy: { minSessions: 'asc' }
    })

    return NextResponse.json(newTiers)
  } catch (error: unknown) {
    console.error('Failed to update commission tiers:', error)
    return NextResponse.json(
      { error: 'Failed to update commission tiers' },
      { status: 500 }
    )
  }
}