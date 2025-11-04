import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// GET /api/commission/profiles/[id] - Get single profile
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { id } = await params
    
    const profile = await prisma.commissionProfile.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId
      },
      include: {
        tiers: {
          orderBy: { tierLevel: 'asc' }
        },
        _count: {
          select: { users: true }
        }
      }
    })
    
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    
    return NextResponse.json(profile)
  } catch (error) {
    console.error('Error fetching commission profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch commission profile' },
      { status: 500 }
    )
  }
}

// PUT /api/commission/profiles/[id] - Update profile
const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  calculationMethod: z.enum(['PROGRESSIVE', 'GRADUATED', 'FLAT']).optional(),
  triggerType: z.enum(['NONE', 'SESSION_COUNT', 'SALES_VOLUME', 'EITHER_OR', 'BOTH_AND']).optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
  tiers: z.array(z.object({
    id: z.string().optional(), // Existing tier ID
    tierLevel: z.number().min(1),
    sessionThreshold: z.number().min(0).optional().nullable(),
    salesThreshold: z.number().min(0).optional().nullable(),
    sessionCommissionPercent: z.number().min(0).max(100).optional().nullable(),
    sessionFlatFee: z.number().min(0).optional().nullable(),
    salesCommissionPercent: z.number().min(0).max(100).optional().nullable(),
    salesFlatFee: z.number().min(0).optional().nullable(),
    tierBonus: z.number().min(0).optional().nullable()
  })).optional()
})

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Only admins can update commission profiles
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const { id } = await params
    const body = await req.json()
    const validatedData = updateProfileSchema.parse(body)
    
    // Check profile exists and belongs to organization
    const existingProfile = await prisma.commissionProfile.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId
      }
    })
    
    if (!existingProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    
    // If setting as default, unset other defaults
    if (validatedData.isDefault === true) {
      await prisma.commissionProfile.updateMany({
        where: {
          organizationId: session.user.organizationId,
          isDefault: true,
          id: { not: id }
        },
        data: {
          isDefault: false
        }
      })
    }
    
    // Update profile
    const profile = await prisma.commissionProfile.update({
      where: { id },
      data: {
        name: validatedData.name,
        calculationMethod: validatedData.calculationMethod,
        triggerType: validatedData.triggerType,
        isDefault: validatedData.isDefault,
        isActive: validatedData.isActive,
        updatedAt: new Date()
      },
      include: {
        tiers: {
          orderBy: { tierLevel: 'asc' }
        }
      }
    })
    
    // Update tiers if provided
    if (validatedData.tiers) {
      // Delete all existing tiers
      await prisma.commissionTierV2.deleteMany({
        where: { profileId: id }
      })
      
      // Create new tiers
      await prisma.commissionTierV2.createMany({
        data: validatedData.tiers.map(tier => ({
          ...tier,
          id: undefined, // Let database generate new IDs
          profileId: id
        }))
      })
      
      // Fetch updated profile with new tiers
      const updatedProfile = await prisma.commissionProfile.findUnique({
        where: { id },
        include: {
          tiers: {
            orderBy: { tierLevel: 'asc' }
          }
        }
      })
      
      return NextResponse.json(updatedProfile)
    }
    
    return NextResponse.json(profile)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error updating commission profile:', error)
    return NextResponse.json(
      { error: 'Failed to update commission profile' },
      { status: 500 }
    )
  }
}

// DELETE /api/commission/profiles/[id] - Delete profile
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Only admins can delete commission profiles
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const { id } = await params
    
    // Check if profile exists and has no assigned users
    const profile = await prisma.commissionProfile.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId
      },
      include: {
        _count: {
          select: { users: true }
        }
      }
    })
    
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    
    if (profile._count.users > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete profile with assigned users',
          userCount: profile._count.users
        },
        { status: 400 }
      )
    }
    
    if (profile.isDefault) {
      return NextResponse.json(
        { error: 'Cannot delete default profile' },
        { status: 400 }
      )
    }
    
    // Soft delete by marking as inactive
    await prisma.commissionProfile.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date()
      }
    })
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETE_COMMISSION_PROFILE',
        entityType: 'CommissionProfile',
        entityId: id,
        oldValue: {
          name: profile.name
        }
      }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting commission profile:', error)
    return NextResponse.json(
      { error: 'Failed to delete commission profile' },
      { status: 500 }
    )
  }
}