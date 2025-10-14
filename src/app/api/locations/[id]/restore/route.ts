import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/locations/[id]/restore - Restore an archived location
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: locationId } = await context.params
  
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can restore locations
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only administrators can restore locations' },
        { status: 403 }
      )
    }

    // Check if location exists and is archived
    const location = await prisma.location.findUnique({
      where: { id: locationId },
      select: {
        id: true,
        name: true,
        active: true,
        archivedAt: true,
        organizationId: true
      }
    })

    if (!location) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      )
    }

    // Check if this is the user's organization
    if (location.organizationId !== session.user.organizationId) {
      return NextResponse.json(
        { error: 'Location not in your organization' },
        { status: 403 }
      )
    }

    // Check if already active
    if (location.active) {
      return NextResponse.json(
        { error: 'Location is already active' },
        { status: 400 }
      )
    }

    // Restore the location
    const restoredLocation = await prisma.location.update({
      where: { id: locationId },
      data: {
        active: true,
        archivedAt: null,
        archivedBy: null,
        archivedReason: null
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'LOCATION_RESTORED',
        entityType: 'location',
        entityId: locationId,
        metadata: {
          locationName: restoredLocation.name,
          previouslyArchivedAt: location.archivedAt
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Location restored successfully',
      location: restoredLocation
    })

  } catch (error) {
    console.error('Error restoring location:', error)
    return NextResponse.json(
      { error: 'Failed to restore location' },
      { status: 500 }
    )
  }
}