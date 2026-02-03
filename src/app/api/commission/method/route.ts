import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/commission/method - Get current calculation method
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get organization's commission method setting
    const organization = await prisma.organization.findUnique({
      where: { id: session.user.organizationId },
      select: { commissionMethod: true }
    })

    // Default to PROGRESSIVE if not set
    const method = organization?.commissionMethod || 'PROGRESSIVE'

    return NextResponse.json({ method })
  } catch (error: unknown) {
    console.error('Failed to fetch commission method:', error)
    return NextResponse.json(
      { error: 'Failed to fetch commission method' },
      { status: 500 }
    )
  }
}

// POST /api/commission/method - Set calculation method (for onboarding)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { method, defaultRate } = body

    // Validate method
    if (!['FLAT', 'PROGRESSIVE', 'GRADUATED', 'CUSTOM'].includes(method)) {
      return NextResponse.json(
        { error: 'Invalid calculation method' },
        { status: 400 }
      )
    }

    // Update organization's commission method
    const updateData: any = { commissionMethod: method }
    
    // For FLAT method, also save the default rate
    if (method === 'FLAT' && typeof defaultRate === 'number') {
      updateData.defaultCommissionRate = defaultRate
    }

    await prisma.organization.update({
      where: { id: session.user.organizationId },
      data: updateData
    })

    return NextResponse.json({ method, defaultRate, message: 'Commission method set successfully' })
  } catch (error: unknown) {
    console.error('Failed to set commission method:', error)
    return NextResponse.json(
      { error: 'Failed to set commission method' },
      { status: 500 }
    )
  }
}

// PUT /api/commission/method - Update calculation method
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins and PT managers can change method
    if (!['ADMIN', 'PT_MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { method, defaultRate } = body

    // Validate method
    if (!['FLAT', 'PROGRESSIVE', 'GRADUATED', 'CUSTOM'].includes(method)) {
      return NextResponse.json(
        { error: 'Invalid calculation method' },
        { status: 400 }
      )
    }

    // Update organization's commission method
    const updateData: any = { commissionMethod: method }
    
    // For FLAT method, also save the default rate
    if (method === 'FLAT' && typeof defaultRate === 'number') {
      updateData.defaultCommissionRate = defaultRate
    }

    await prisma.organization.update({
      where: { id: session.user.organizationId },
      data: updateData
    })

    return NextResponse.json({ method, defaultRate, message: 'Commission method updated successfully' })
  } catch (error: unknown) {
    console.error('Failed to update commission method:', error)
    return NextResponse.json(
      { error: 'Failed to update commission method' },
      { status: 500 }
    )
  }
}