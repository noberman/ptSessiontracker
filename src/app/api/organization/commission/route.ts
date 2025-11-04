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
    const { method, flatFee, flatPercentage, tiers } = body

    if (!session.user.organizationId) {
      return NextResponse.json(
        { error: 'No organization found' },
        { status: 400 }
      )
    }

    // Check if organization already has v2 commission profiles
    const existingProfile = await prisma.commissionProfile.findFirst({
      where: {
        organizationId: session.user.organizationId,
        isDefault: true
      }
    })

    if (existingProfile) {
      // Update existing default profile
      await prisma.commissionProfile.update({
        where: { id: existingProfile.id },
        data: {
          calculationMethod: method === 'FLAT_FEE' || method === 'PERCENTAGE' ? 'FLAT' : 'PROGRESSIVE',
          triggerType: method === 'PROGRESSIVE' ? 'SESSION_COUNT' : 'NONE'
        }
      })
      
      // Delete existing tiers and recreate
      await prisma.commissionTierV2.deleteMany({
        where: { profileId: existingProfile.id }
      })
      
      // Create new tiers based on method
      if (method === 'FLAT_FEE') {
        await prisma.commissionTierV2.create({
          data: {
            profileId: existingProfile.id,
            tierLevel: 1,
            sessionThreshold: 1,
            sessionFlatFee: flatFee || 50
          }
        })
      } else if (method === 'PERCENTAGE') {
        await prisma.commissionTierV2.create({
          data: {
            profileId: existingProfile.id,
            tierLevel: 1,
            sessionThreshold: 1,
            sessionCommissionPercent: flatPercentage || 50
          }
        })
      } else if (method === 'PROGRESSIVE' && tiers) {
        await prisma.commissionTierV2.createMany({
          data: tiers.map((tier: any, index: number) => ({
            profileId: existingProfile.id,
            tierLevel: index + 1,
            sessionThreshold: tier.min,
            sessionCommissionPercent: tier.type === 'percentage' ? tier.percentage : null,
            sessionFlatFee: tier.type === 'flat' ? tier.flatFee : null
          }))
        })
      }
    } else {
      // Create new v2 commission profile
      const profile = await prisma.commissionProfile.create({
        data: {
          organizationId: session.user.organizationId,
          name: 'Standard Commission',
          isDefault: true,
          isActive: true,
          calculationMethod: method === 'FLAT_FEE' || method === 'PERCENTAGE' ? 'FLAT' : 'PROGRESSIVE',
          triggerType: method === 'PROGRESSIVE' ? 'SESSION_COUNT' : 'NONE',
          tiers: {
            create: method === 'FLAT_FEE' 
              ? [{
                  tierLevel: 1,
                  sessionThreshold: 1,
                  sessionFlatFee: flatFee || 50
                }]
              : method === 'PERCENTAGE'
              ? [{
                  tierLevel: 1,
                  sessionThreshold: 1,
                  sessionCommissionPercent: flatPercentage || 50
                }]
              : tiers?.map((tier: any, index: number) => ({
                  tierLevel: index + 1,
                  sessionThreshold: tier.min,
                  sessionCommissionPercent: tier.type === 'percentage' ? tier.percentage : null,
                  sessionFlatFee: tier.type === 'flat' ? tier.flatFee : null
                }))
          }
        }
      })
      
      // Assign all existing trainers to this profile
      await prisma.user.updateMany({
        where: {
          organizationId: session.user.organizationId,
          role: 'TRAINER'
        },
        data: {
          commissionProfileId: profile.id
        }
      })
    }

    // Also create v1 tiers for backward compatibility (temporary)
    // This can be removed once v1 system is fully deprecated
    try {
      // Update organization commission method
      await prisma.organization.update({
        where: { id: session.user.organizationId },
        data: {
          commissionMethod: method === 'FLAT_FEE' || method === 'PERCENTAGE' ? 'FLAT' : 'PROGRESSIVE',
        }
      })

      // Delete existing v1 tiers
      await prisma.commissionTier.deleteMany({
        where: { organizationId: session.user.organizationId }
      })

      // Create v1 tiers for compatibility
      if (method === 'PROGRESSIVE' && tiers && tiers.length > 0) {
        await prisma.commissionTier.createMany({
          data: tiers.map((tier: any) => ({
            organizationId: session.user.organizationId,
            minSessions: tier.min,
            maxSessions: tier.max,
            percentage: tier.type === 'percentage' ? (tier.percentage / 100) : 0.5, // Use percentage if available, default to 50%
          }))
        })
      } else if (method === 'PERCENTAGE') {
        await prisma.commissionTier.create({
          data: {
            organizationId: session.user.organizationId,
            minSessions: 1,
            maxSessions: null,
            percentage: (flatPercentage || 50) / 100,
          }
        })
      } else if (method === 'FLAT_FEE') {
        // For flat fee, create a v1 tier with 50% as fallback (v1 doesn't support flat fees)
        await prisma.commissionTier.create({
          data: {
            organizationId: session.user.organizationId,
            minSessions: 1,
            maxSessions: null,
            percentage: 0.5, // Default 50% for v1 compatibility
          }
        })
      }
    } catch (v1Error) {
      // Log but don't fail if v1 creation fails
      console.warn('Could not create v1 tiers (may be expected if v1 is removed):', v1Error)
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

    // First try to get v2 profile
    const profile = await prisma.commissionProfile.findFirst({
      where: {
        organizationId: session.user.organizationId,
        isDefault: true
      },
      include: {
        tiers: {
          orderBy: { tierLevel: 'asc' }
        }
      }
    })

    if (profile) {
      // Return v2 profile data
      let method: string
      let responseData: any = {}
      
      if (profile.calculationMethod === 'FLAT' && profile.tiers.length === 1) {
        const tier = profile.tiers[0]
        if (tier.sessionFlatFee) {
          method = 'FLAT_FEE'
          responseData.flatFee = tier.sessionFlatFee
        } else if (tier.sessionCommissionPercent) {
          method = 'PERCENTAGE'
          responseData.flatPercentage = tier.sessionCommissionPercent
        } else {
          method = 'PERCENTAGE'
          responseData.flatPercentage = 50
        }
      } else {
        method = 'PROGRESSIVE'
        responseData.tiers = profile.tiers.map(tier => ({
          min: tier.sessionThreshold || 1,
          max: null, // v2 doesn't have max, calculate from next tier
          type: tier.sessionFlatFee ? 'flat' : 'percentage',
          percentage: tier.sessionCommissionPercent || 50,
          flatFee: tier.sessionFlatFee || 50
        }))
        
        // Set max values based on next tier's min
        for (let i = 0; i < responseData.tiers.length - 1; i++) {
          responseData.tiers[i].max = (responseData.tiers[i + 1].min || 1) - 1
        }
      }
      
      return NextResponse.json({
        method,
        ...responseData
      })
    }

    // Fallback to v1 if no v2 profile exists
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
        type: 'percentage',
        percentage: tier.percentage * 100, // Convert decimal to percentage
        flatFee: 50 // Default flat fee
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