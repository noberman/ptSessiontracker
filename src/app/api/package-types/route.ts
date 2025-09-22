import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getOrganizationId } from '@/lib/organization-context'
import { ensurePackageTypes } from '@/lib/package-types/ensure-package-types'

// GET /api/package-types - List organization's package types
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get organization context
    const organizationId = await getOrganizationId()
    
    // Ensure package types exist for this organization
    await ensurePackageTypes(organizationId)
    
    const searchParams = request.nextUrl.searchParams
    const includeInactive = searchParams.get('includeInactive') === 'true'
    
    const where: any = {
      organizationId
    }
    
    if (!includeInactive) {
      where.isActive = true
    }
    
    const packageTypes = await prisma.packageType.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: { packages: true }
        }
      }
    })
    
    return NextResponse.json(packageTypes)
  } catch (error) {
    console.error('Error fetching package types:', error)
    return NextResponse.json(
      { error: 'Failed to fetch package types' },
      { status: 500 }
    )
  }
}

// POST /api/package-types - Create new package type
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only managers and admins can create package types
    if (!['PT_MANAGER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { 
      name, 
      defaultSessions, 
      defaultPrice, 
      sortOrder 
    } = body

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    // Get organization context
    const organizationId = await getOrganizationId()
    
    // Check if name already exists for this organization
    const existing = await prisma.packageType.findUnique({
      where: {
        organizationId_name: {
          organizationId,
          name: name.trim()
        }
      }
    })
    
    if (existing) {
      return NextResponse.json(
        { error: 'Package type with this name already exists' },
        { status: 400 }
      )
    }
    
    // Create package type
    const packageType = await prisma.packageType.create({
      data: {
        organizationId,
        name: name.trim(),
        defaultSessions,
        defaultPrice,
        sortOrder: sortOrder || 0
      }
    })
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'PACKAGE_TYPE_CREATED',
        userId: session.user.id,
        entityType: 'PackageType',
        entityId: packageType.id,
        newValue: {
          name: packageType.name
        }
      }
    })
    
    return NextResponse.json(packageType, { status: 201 })
  } catch (error) {
    console.error('Error creating package type:', error)
    return NextResponse.json(
      { error: 'Failed to create package type' },
      { status: 500 }
    )
  }
}