import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get commission tiers
    const tiers = await prisma.commissionTier.findMany({
      orderBy: { minSessions: 'asc' }
    })
    
    return NextResponse.json({ tiers })
    
  } catch (error: unknown) {
    console.error('Failed to fetch commission tiers:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch tiers' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { tiers } = await request.json()
    
    if (!tiers || !Array.isArray(tiers)) {
      return NextResponse.json({ error: 'Invalid tiers data' }, { status: 400 })
    }
    
    // Validate tiers
    for (let i = 0; i < tiers.length; i++) {
      const tier = tiers[i]
      if (typeof tier.minSessions !== 'number' || tier.minSessions < 0) {
        return NextResponse.json({ error: `Invalid minSessions for tier ${i + 1}` }, { status: 400 })
      }
      if (tier.maxSessions !== null && (typeof tier.maxSessions !== 'number' || tier.maxSessions <= tier.minSessions)) {
        return NextResponse.json({ error: `Invalid maxSessions for tier ${i + 1}` }, { status: 400 })
      }
      if (typeof tier.percentage !== 'number' || tier.percentage < 0 || tier.percentage > 1) {
        return NextResponse.json({ error: `Invalid percentage for tier ${i + 1}` }, { status: 400 })
      }
    }
    
    // Delete existing tiers and create new ones in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Delete all existing tiers
      await tx.commissionTier.deleteMany({})
      
      // Create new tiers
      const createdTiers = await tx.commissionTier.createMany({
        data: tiers.map(tier => ({
          minSessions: tier.minSessions,
          maxSessions: tier.maxSessions || null,
          percentage: tier.percentage
        }))
      })
      
      // Fetch and return the created tiers
      const newTiers = await tx.commissionTier.findMany({
        orderBy: { minSessions: 'asc' }
      })
      
      return newTiers
    })
    
    return NextResponse.json({ 
      message: 'Commission tiers set successfully',
      tiers: result 
    })
    
  } catch (error: unknown) {
    console.error('Failed to set commission tiers:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to set tiers' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Only admins and PT managers can update tiers
    if (session.user.role !== 'ADMIN' && session.user.role !== 'PT_MANAGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const { tiers } = await request.json()
    
    if (!tiers || !Array.isArray(tiers)) {
      return NextResponse.json({ error: 'Invalid tiers data' }, { status: 400 })
    }
    
    // Validate tiers
    for (let i = 0; i < tiers.length; i++) {
      const tier = tiers[i]
      if (typeof tier.minSessions !== 'number' || tier.minSessions < 0) {
        return NextResponse.json({ error: `Invalid minSessions for tier ${i + 1}` }, { status: 400 })
      }
      if (tier.maxSessions !== null && (typeof tier.maxSessions !== 'number' || tier.maxSessions <= tier.minSessions)) {
        return NextResponse.json({ error: `Invalid maxSessions for tier ${i + 1}` }, { status: 400 })
      }
      if (typeof tier.percentage !== 'number' || tier.percentage < 0 || tier.percentage > 100) {
        return NextResponse.json({ error: `Invalid percentage for tier ${i + 1}` }, { status: 400 })
      }
    }
    
    // Delete existing tiers and create new ones in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Delete all existing tiers
      await tx.commissionTier.deleteMany({})
      
      // Create new tiers
      const createdTiers = await tx.commissionTier.createMany({
        data: tiers.map(tier => ({
          minSessions: tier.minSessions,
          maxSessions: tier.maxSessions || null,
          percentage: tier.percentage
        }))
      })
      
      // Fetch and return the created tiers
      const newTiers = await tx.commissionTier.findMany({
        orderBy: { minSessions: 'asc' }
      })
      
      return newTiers
    })
    
    return NextResponse.json({ 
      message: 'Commission tiers updated successfully',
      tiers: result 
    })
    
  } catch (error: unknown) {
    console.error('Failed to update commission tiers:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update tiers' },
      { status: 500 }
    )
  }
}