import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { userHasLocationAccess } from '@/lib/user-locations'

// GET /api/packages/[id] - Get single package details
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

    const packageData = await prisma.package.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            locationId: true,
            primaryTrainerId: true,
          },
        },
        sessions: {
          orderBy: {
            sessionDate: 'desc',
          },
          take: 10,
          include: {
            trainer: {
              select: {
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            sessions: true,
          },
        },
      },
    })

    if (!packageData) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 })
    }

    // Check permissions
    if (session.user.role === 'TRAINER') {
      if (packageData.client.primaryTrainerId !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else if (session.user.role === 'CLUB_MANAGER' || session.user.role === 'PT_MANAGER') {
      const hasAccess = await userHasLocationAccess(
        session.user.id,
        session.user.role,
        packageData.client.locationId
      )
      if (!hasAccess) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    return NextResponse.json(packageData)
  } catch (error) {
    console.error('Error fetching package:', error)
    return NextResponse.json(
      { error: 'Failed to fetch package' },
      { status: 500 }
    )
  }
}

// PUT /api/packages/[id] - Update package information
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

    // Trainers cannot update packages
    if (session.user.role === 'TRAINER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { 
      name, 
      packageTypeId,
      totalValue, 
      totalSessions,
      remainingSessions,
      startDate,
      expiresAt,
      active 
    } = body

    // Get current package
    const currentPackage = await prisma.package.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            locationId: true,
          },
        },
      },
    })

    if (!currentPackage) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 })
    }

    // Check permissions for club managers and PT managers
    if (session.user.role === 'CLUB_MANAGER' || session.user.role === 'PT_MANAGER') {
      const hasAccess = await userHasLocationAccess(
        session.user.id,
        session.user.role,
        currentPackage.client.locationId
      )
      if (!hasAccess) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const updateData: any = {}
    
    if (name !== undefined) updateData.name = name
    if (packageTypeId !== undefined) updateData.packageTypeId = packageTypeId || null
    if (active !== undefined) updateData.active = active
    if (startDate !== undefined) updateData.startDate = new Date(startDate)
    if (expiresAt !== undefined) updateData.expiresAt = expiresAt ? new Date(expiresAt) : null
    
    // If total value or sessions change, recalculate session value
    if (totalValue !== undefined || totalSessions !== undefined) {
      const newTotalValue = totalValue !== undefined ? totalValue : currentPackage.totalValue
      const newTotalSessions = totalSessions !== undefined ? totalSessions : currentPackage.totalSessions
      
      updateData.totalValue = newTotalValue
      updateData.totalSessions = newTotalSessions
      updateData.sessionValue = newTotalSessions > 0 ? newTotalValue / newTotalSessions : 0
    }
    
    // Only admins can manually adjust remaining sessions
    if (remainingSessions !== undefined && session.user.role === 'ADMIN') {
      updateData.remainingSessions = remainingSessions
    }

    // Update package
    const updatedPackage = await prisma.package.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        packageType: true,
        packageTypeId: true,
        name: true,
        totalValue: true,
        totalSessions: true,
        remainingSessions: true,
        sessionValue: true,
        startDate: true,
        expiresAt: true,
        active: true,
        updatedAt: true,
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'PACKAGE_UPDATED',
        userId: session.user.id,
        entityType: 'Package',
        entityId: updatedPackage.id,
        oldValue: currentPackage,
        newValue: updateData,
      },
    })

    return NextResponse.json(updatedPackage)
  } catch (error) {
    console.error('Error updating package:', error)
    return NextResponse.json(
      { error: 'Failed to update package' },
      { status: 500 }
    )
  }
}

// DELETE /api/packages/[id] - Soft delete package
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

    // Only admins can delete packages
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check if package has sessions
    const packageData = await prisma.package.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            sessions: true,
          },
        },
      },
    })

    if (!packageData) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 })
    }

    if (packageData._count.sessions > 0) {
      // If package has sessions, just deactivate it
      await prisma.package.update({
        where: { id },
        data: { active: false },
      })
    } else {
      // If no sessions, can safely delete
      await prisma.package.delete({
        where: { id },
      })
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'PACKAGE_DELETED',
        userId: session.user.id,
        entityType: 'Package',
        entityId: id,
        oldValue: { active: true },
        newValue: { active: false },
      },
    })

    return NextResponse.json({ 
      message: 'Package deleted successfully',
      deactivated: packageData._count.sessions > 0
    })
  } catch (error) {
    console.error('Error deleting package:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete package' },
      { status: 500 }
    )
  }
}