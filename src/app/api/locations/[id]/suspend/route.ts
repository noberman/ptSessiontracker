import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/locations/[id]/suspend - Suspend a location
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Only admins and managers can suspend locations
  if (!['ADMIN', 'PT_MANAGER', 'CLUB_MANAGER'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  
  try {
    const body = await request.json()
    const { reason = 'LIMIT_EXCEEDED' } = body
    
    // Get the location
    const location = await prisma.location.findUnique({
      where: { id },
      select: { 
        organizationId: true,
        suspendedAt: true,
        active: true
      }
    })
    
    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }
    
    // Check if already suspended
    if (location.suspendedAt) {
      return NextResponse.json({ error: 'Location already suspended' }, { status: 400 })
    }
    
    // Verify organization access
    if (session.user.role !== 'ADMIN' && location.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: 'Cannot suspend locations from other organizations' }, { status: 403 })
    }
    
    // Suspend the location
    const updatedLocation = await prisma.location.update({
      where: { id },
      data: {
        suspendedAt: new Date(),
        suspendedReason: reason
      },
      select: {
        id: true,
        name: true,
        suspendedAt: true,
        suspendedReason: true
      }
    })
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'LOCATION_SUSPENDED',
        userId: session.user.id,
        entityType: 'Location',
        entityId: id,
        oldValue: { suspendedAt: null },
        newValue: { suspendedAt: updatedLocation.suspendedAt, reason }
      }
    })
    
    return NextResponse.json({
      message: 'Location suspended successfully',
      location: updatedLocation
    })
  } catch (error) {
    console.error('Error suspending location:', error)
    return NextResponse.json(
      { error: 'Failed to suspend location' },
      { status: 500 }
    )
  }
}

// DELETE /api/locations/[id]/suspend - Unsuspend a location
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Only admins and managers can unsuspend locations
  if (!['ADMIN', 'PT_MANAGER', 'CLUB_MANAGER'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  
  try {
    // Get the location
    const location = await prisma.location.findUnique({
      where: { id },
      select: { 
        organizationId: true,
        suspendedAt: true,
        suspendedReason: true
      }
    })
    
    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }
    
    // Check if not suspended
    if (!location.suspendedAt) {
      return NextResponse.json({ error: 'Location not suspended' }, { status: 400 })
    }
    
    // Verify organization access
    if (session.user.role !== 'ADMIN' && location.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: 'Cannot unsuspend locations from other organizations' }, { status: 403 })
    }
    
    // Unsuspend the location
    const updatedLocation = await prisma.location.update({
      where: { id },
      data: {
        suspendedAt: null,
        suspendedReason: null
      },
      select: {
        id: true,
        name: true,
        suspendedAt: true,
        suspendedReason: true
      }
    })
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'LOCATION_UNSUSPENDED',
        userId: session.user.id,
        entityType: 'Location',
        entityId: id,
        oldValue: { suspendedAt: location.suspendedAt, reason: location.suspendedReason },
        newValue: { suspendedAt: null }
      }
    })
    
    return NextResponse.json({
      message: 'Location unsuspended successfully',
      location: updatedLocation
    })
  } catch (error) {
    console.error('Error unsuspending location:', error)
    return NextResponse.json(
      { error: 'Failed to unsuspend location' },
      { status: 500 }
    )
  }
}