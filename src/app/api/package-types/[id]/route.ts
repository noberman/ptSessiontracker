import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getOrganizationId } from '@/lib/organization-context'

// GET /api/package-types/[id] - Get single package type
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get organization context
    const organizationId = await getOrganizationId()
    
    const packageType = await prisma.packageType.findUnique({
      where: { 
        id,
        organizationId // Ensure package type belongs to same org
      },
      include: {
        _count: {
          select: { packages: true }
        }
      }
    })
    
    if (!packageType) {
      return NextResponse.json({ error: 'Package type not found' }, { status: 404 })
    }
    
    return NextResponse.json(packageType)
  } catch (error) {
    console.error('Error fetching package type:', error)
    return NextResponse.json(
      { error: 'Failed to fetch package type' },
      { status: 500 }
    )
  }
}

// PUT /api/package-types/[id] - Update package type
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only managers and admins can update package types
    if (!['PT_MANAGER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { 
      name, 
      defaultSessions, 
      defaultPrice, 
      sortOrder,
      isActive 
    } = body

    // Get organization context
    const organizationId = await getOrganizationId()
    
    // Get current package type
    const currentType = await prisma.packageType.findUnique({
      where: { 
        id,
        organizationId // Ensure package type belongs to same org
      }
    })
    
    if (!currentType) {
      return NextResponse.json({ error: 'Package type not found' }, { status: 404 })
    }
    
    // If name is being changed, check if new name is unique
    if (name && name !== currentType.name) {
      const existing = await prisma.packageType.findUnique({
        where: {
          organizationId_name: {
            organizationId,
            name: name.trim()
          }
        }
      })
      
      if (existing && existing.id !== id) {
        return NextResponse.json(
          { error: 'Package type with this name already exists' },
          { status: 400 }
        )
      }
    }
    
    const updateData: any = {}
    if (name !== undefined) updateData.name = name.trim()
    if (defaultSessions !== undefined) updateData.defaultSessions = defaultSessions
    if (defaultPrice !== undefined) updateData.defaultPrice = defaultPrice
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder
    if (isActive !== undefined) updateData.isActive = isActive
    
    // Update package type
    const updatedType = await prisma.packageType.update({
      where: { id },
      data: updateData
    })
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'PACKAGE_TYPE_UPDATED',
        userId: session.user.id,
        entityType: 'PackageType',
        entityId: updatedType.id,
        oldValue: currentType,
        newValue: updateData
      }
    })
    
    return NextResponse.json(updatedType)
  } catch (error) {
    console.error('Error updating package type:', error)
    return NextResponse.json(
      { error: 'Failed to update package type' },
      { status: 500 }
    )
  }
}

// DELETE /api/package-types/[id] - Soft delete (deactivate) package type
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can delete package types
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get organization context
    const organizationId = await getOrganizationId()
    
    // Check if package type exists and belongs to organization
    const packageType = await prisma.packageType.findUnique({
      where: { 
        id,
        organizationId
      },
      include: {
        _count: {
          select: { packages: true }
        }
      }
    })
    
    if (!packageType) {
      return NextResponse.json({ error: 'Package type not found' }, { status: 404 })
    }
    
    // Check if there are packages using this type
    if (packageType._count.packages > 0) {
      return NextResponse.json(
        { error: `Cannot delete package type with ${packageType._count.packages} associated packages` },
        { status: 400 }
      )
    }
    
    // Soft delete by setting inactive
    const updatedType = await prisma.packageType.update({
      where: { id },
      data: { isActive: false }
    })
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'PACKAGE_TYPE_DELETED',
        userId: session.user.id,
        entityType: 'PackageType',
        entityId: id,
        oldValue: { name: packageType.name },
        newValue: { isActive: false }
      }
    })
    
    return NextResponse.json({ message: 'Package type deactivated successfully' })
  } catch (error) {
    console.error('Error deleting package type:', error)
    return NextResponse.json(
      { error: 'Failed to delete package type' },
      { status: 500 }
    )
  }
}