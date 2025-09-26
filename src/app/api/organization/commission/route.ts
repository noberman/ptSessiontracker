import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { method, rate, tiers } = body

    if (!session.user.organizationId) {
      return NextResponse.json(
        { error: 'No organization found' },
        { status: 400 }
      )
    }

    // Update organization commission method
    await prisma.organization.update({
      where: { id: session.user.organizationId },
      data: {
        commissionMethod: method,
      }
    })

    // Delete existing tiers
    await prisma.commissionTier.deleteMany({
      where: { organizationId: session.user.organizationId }
    })

    // Create new tiers based on method
    if (method === 'PROGRESSIVE' && tiers && tiers.length > 0) {
      await prisma.commissionTier.createMany({
        data: tiers.map((tier: any) => ({
          organizationId: session.user.organizationId,
          minSessions: tier.min,
          maxSessions: tier.max,
          percentage: tier.percentage / 100, // Convert percentage to decimal
        }))
      })
    } else if (method === 'FLAT' && rate) {
      // For flat rate, create a single tier
      await prisma.commissionTier.create({
        data: {
          organizationId: session.user.organizationId,
          minSessions: 1,
          maxSessions: null,
          percentage: rate / 100, // Convert percentage to decimal
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Commission settings saved successfully'
    })

  } catch (error: any) {
    console.error('Commission save error:', error)
    return NextResponse.json(
      { error: 'Failed to save commission settings' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || !session.user.organizationId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const organization = await prisma.organization.findUnique({
      where: { id: session.user.organizationId },
      include: {
        commissionTiers: {
          orderBy: { minSessions: 'asc' }
        }
      }
    })

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      method: organization.commissionMethod || 'PROGRESSIVE',
      tiers: organization.commissionTiers.map(tier => ({
        min: tier.minSessions,
        max: tier.maxSessions,
        percentage: tier.percentage * 100, // Convert decimal to percentage
      }))
    })

  } catch (error: any) {
    console.error('Commission fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch commission settings' },
      { status: 500 }
    )
  }
}