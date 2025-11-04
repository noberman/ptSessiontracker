import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// GET /api/commission/profiles - List all profiles for organization
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Only managers and admins can view commission profiles
    if (!['PT_MANAGER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const profiles = await prisma.commissionProfile.findMany({
      where: {
        organizationId: session.user.organizationId,
        isActive: true
      },
      include: {
        tiers: {
          orderBy: { tierLevel: 'asc' }
        },
        _count: {
          select: { users: true }
        }
      },
      orderBy: {
        isDefault: 'desc' // Default profile first
      }
    })
    
    return NextResponse.json(profiles)
  } catch (error) {
    console.error('Error fetching commission profiles:', error)
    return NextResponse.json(
      { error: 'Failed to fetch commission profiles' },
      { status: 500 }
    )
  }
}

// POST /api/commission/profiles - Create new profile
const createProfileSchema = z.object({
  name: z.string().min(1).max(100),
  calculationMethod: z.enum(['PROGRESSIVE', 'GRADUATED', 'FLAT']),
  triggerType: z.enum(['NONE', 'SESSION_COUNT', 'SALES_VOLUME', 'EITHER_OR', 'BOTH_AND']),
  isDefault: z.boolean().optional(),
  tiers: z.array(z.object({
    tierLevel: z.number().min(1),
    sessionThreshold: z.number().min(0).optional().nullable(),
    salesThreshold: z.number().min(0).optional().nullable(),
    sessionCommissionPercent: z.number().min(0).max(100).optional().nullable(),
    sessionFlatFee: z.number().min(0).optional().nullable(),
    salesCommissionPercent: z.number().min(0).max(100).optional().nullable(),
    salesFlatFee: z.number().min(0).optional().nullable(),
    tierBonus: z.number().min(0).optional().nullable()
  }))
})

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Only admins can create commission profiles
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const body = await req.json()
    const validatedData = createProfileSchema.parse(body)
    
    // If this is set as default, unset other defaults
    if (validatedData.isDefault) {
      await prisma.commissionProfile.updateMany({
        where: {
          organizationId: session.user.organizationId,
          isDefault: true
        },
        data: {
          isDefault: false
        }
      })
    }
    
    // Create the profile with tiers
    const profile = await prisma.commissionProfile.create({
      data: {
        organizationId: session.user.organizationId,
        name: validatedData.name,
        calculationMethod: validatedData.calculationMethod,
        triggerType: validatedData.triggerType,
        isDefault: validatedData.isDefault || false,
        isActive: true,
        tiers: {
          create: validatedData.tiers
        }
      },
      include: {
        tiers: {
          orderBy: { tierLevel: 'asc' }
        }
      }
    })
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE_COMMISSION_PROFILE',
        entityType: 'CommissionProfile',
        entityId: profile.id,
        newValue: {
          name: profile.name,
          method: profile.calculationMethod,
          tiersCount: profile.tiers.length
        }
      }
    })
    
    return NextResponse.json(profile, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      )
    }
    
    console.error('Error creating commission profile:', error)
    return NextResponse.json(
      { error: 'Failed to create commission profile' },
      { status: 500 }
    )
  }
}