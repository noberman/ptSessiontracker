import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getOrganizationId } from '@/lib/organization-context'

// PUT /api/package-types/reorder - Batch update sort orders
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only managers and admins can reorder package types
    if (!['PT_MANAGER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { updates } = body

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json(
        { error: 'Invalid updates array' },
        { status: 400 }
      )
    }

    // Get organization context
    const organizationId = await getOrganizationId()

    // Batch update sort orders
    const updatePromises = updates.map(({ id, sortOrder }) =>
      prisma.packageType.update({
        where: {
          id,
          organizationId // Ensure we only update our org's types
        },
        data: { sortOrder }
      })
    )

    await Promise.all(updatePromises)

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'PACKAGE_TYPES_REORDERED',
        userId: session.user.id,
        entityType: 'PackageType',
        entityId: organizationId,
        newValue: { updates }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error reordering package types:', error)
    return NextResponse.json(
      { error: 'Failed to reorder package types' },
      { status: 500 }
    )
  }
}