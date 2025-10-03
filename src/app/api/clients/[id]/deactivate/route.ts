import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { userHasLocationAccess } from '@/lib/user-locations'

// POST - Deactivate (soft delete) a client
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only managers and admins can deactivate clients
  if (!['ADMIN', 'PT_MANAGER', 'CLUB_MANAGER'].includes(session.user.role)) {
    return NextResponse.json(
      { error: 'You do not have permission to deactivate clients' },
      { status: 403 }
    )
  }

  try {
    const { id } = await params

    // Get the client first to check if it exists
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        packages: {
          where: { active: true }
        },
        sessions: {
          where: { 
            validated: false,
            validationExpiry: {
              gte: new Date()
            }
          }
        }
      }
    })

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    // Check if already inactive
    if (!client.active) {
      return NextResponse.json(
        { error: 'Client is already deactivated' },
        { status: 400 }
      )
    }

    // Check for club manager and PT manager permissions
    if (session.user.role === 'CLUB_MANAGER' || session.user.role === 'PT_MANAGER') {
      const hasAccess = await userHasLocationAccess(
        session.user.id,
        session.user.role,
        client.locationId
      )
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'You can only deactivate clients from your accessible locations' },
          { status: 403 }
        )
      }
    }

    // Warn if client has active packages
    const hasActivePackages = client.packages.length > 0
    const hasPendingSessions = client.sessions.length > 0

    // Deactivate the client
    await prisma.client.update({
      where: { id },
      data: {
        active: false,
        updatedAt: new Date()
      }
    })

    // Also deactivate all active packages
    if (hasActivePackages) {
      await prisma.package.updateMany({
        where: {
          clientId: id,
          active: true
        },
        data: {
          active: false
        }
      })
    }

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DEACTIVATE_CLIENT',
        entityType: 'Client',
        entityId: id,
        oldValue: { active: true },
        newValue: { 
          active: false,
          deactivatedBy: session.user.email,
          hadActivePackages: hasActivePackages,
          hadPendingSessions: hasPendingSessions
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Client deactivated successfully',
      warnings: {
        hadActivePackages: hasActivePackages,
        hadPendingSessions: hasPendingSessions,
        packagesDeactivated: hasActivePackages ? client.packages.length : 0
      }
    })
  } catch (error: any) {
    console.error('Client deactivation error:', error)
    return NextResponse.json(
      { error: 'Failed to deactivate client' },
      { status: 500 }
    )
  }
}

// PUT - Reactivate a client
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only managers and admins can reactivate clients
  if (!['ADMIN', 'PT_MANAGER', 'CLUB_MANAGER'].includes(session.user.role)) {
    return NextResponse.json(
      { error: 'You do not have permission to reactivate clients' },
      { status: 403 }
    )
  }

  try {
    const { id } = await params
    const body = await request.json()
    const { reactivatePackages = false } = body

    // Get the client
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        packages: true
      }
    })

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    // Check if already active
    if (client.active) {
      return NextResponse.json(
        { error: 'Client is already active' },
        { status: 400 }
      )
    }

    // Check for club manager and PT manager permissions
    if (session.user.role === 'CLUB_MANAGER' || session.user.role === 'PT_MANAGER') {
      const hasAccess = await userHasLocationAccess(
        session.user.id,
        session.user.role,
        client.locationId
      )
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'You can only reactivate clients from your accessible locations' },
          { status: 403 }
        )
      }
    }

    // Reactivate the client
    await prisma.client.update({
      where: { id },
      data: {
        active: true,
        updatedAt: new Date()
      }
    })

    // Optionally reactivate packages that haven't expired
    let packagesReactivated = 0
    if (reactivatePackages) {
      const result = await prisma.package.updateMany({
        where: {
          clientId: id,
          active: false,
          OR: [
            { expiresAt: null },
            { expiresAt: { gte: new Date() } }
          ]
        },
        data: {
          active: true
        }
      })
      packagesReactivated = result.count
    }

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'REACTIVATE_CLIENT',
        entityType: 'Client',
        entityId: id,
        oldValue: { active: false },
        newValue: { 
          active: true,
          reactivatedBy: session.user.email,
          packagesReactivated
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Client reactivated successfully',
      packagesReactivated
    })
  } catch (error: any) {
    console.error('Client reactivation error:', error)
    return NextResponse.json(
      { error: 'Failed to reactivate client' },
      { status: 500 }
    )
  }
}