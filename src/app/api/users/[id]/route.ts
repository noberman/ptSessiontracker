import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { getOrganizationId } from '@/lib/organization-context'
import { getActivePackageWhereClause } from '@/lib/package-status'

// GET /api/users/[id] - Get single user details
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

    const user = await prisma.user.findUnique({
      where: { 
        id,
        organizationId // Ensure user belongs to same org
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        locations: {
          select: {
            location: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check permissions
    if (session.user.role === 'TRAINER' && user.id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // For now, skip location-based checks as we're using UserLocation table
    if (session.user.role === 'CLUB_MANAGER' && 
        user.id !== session.user.id) {
      // Could add UserLocation check here if needed
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    )
  }
}

// PUT /api/users/[id] - Update user information
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

    const body = await request.json()
    const { name, email, password, role, locationIds, active, commissionProfileId } = body

    // Get organization context
    const organizationId = await getOrganizationId()

    // Get current user
    const currentUser = await prisma.user.findUnique({
      where: { 
        id,
        organizationId // Ensure user belongs to same org
      },
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check permissions
    if (session.user.role === 'TRAINER' && id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (session.user.role === 'CLUB_MANAGER') {
      // Check if club manager has access to the same locations as the target user
      if (id !== session.user.id) {
        const [managerLocations, userLocations] = await Promise.all([
          prisma.userLocation.findMany({
            where: { userId: session.user.id },
            select: { locationId: true }
          }),
          prisma.userLocation.findMany({
            where: { userId: id },
            select: { locationId: true }
          })
        ])
        
        const managerLocationIds = managerLocations.map(ul => ul.locationId)
        const userLocationIds = userLocations.map(ul => ul.locationId)
        const hasSharedLocation = userLocationIds.some(locId => managerLocationIds.includes(locId))
        
        if (!hasSharedLocation) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
      }
      // Club managers can't change roles
      if (role && role !== currentUser.role) {
        return NextResponse.json(
          { error: 'Cannot change user roles' },
          { status: 403 }
        )
      }
    }

    // Prevent users from changing their own role
    if (id === session.user.id && role && role !== session.user.role) {
      return NextResponse.json(
        { error: 'Cannot change your own role' },
        { status: 403 }
      )
    }

    // Prevent removing last admin
    if (role && currentUser.role === 'ADMIN' && role !== 'ADMIN') {
      const adminCount = await prisma.user.count({
        where: { 
          role: 'ADMIN',
          active: true,
          organizationId // Count admins in same org
        }
      })
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot remove last admin from system' },
          { status: 400 }
        )
      }
    }

    // Handle role downgrade impacts - reassign clients if trainer role is being changed
    if (role && currentUser.role === 'TRAINER' && role !== 'TRAINER') {
      // Check if trainer has assigned clients
      const clientCount = await prisma.client.count({
        where: { primaryTrainerId: id }
      })
      if (clientCount > 0) {
        return NextResponse.json(
          { error: `Cannot change role: ${clientCount} clients are assigned to this trainer. Please reassign them first.` },
          { status: 400 }
        )
      }
    }

    // Check if email is being changed and if it's unique within the organization
    if (email && email !== currentUser.email) {
      const existingUser = await prisma.user.findFirst({
        where: { 
          email,
          organizationId: currentUser.organizationId
        },
      })
      if (existingUser) {
        return NextResponse.json(
          { error: 'Email already exists in this organization' },
          { status: 400 }
        )
      }
    }

    // Validate that non-admin users maintain at least one location
    const targetRole = role !== undefined ? role : currentUser.role
    if (targetRole !== 'ADMIN') {
      // Check if they're trying to remove all locations
      if (locationIds !== undefined && locationIds.length === 0) {
        return NextResponse.json(
          { error: 'Non-admin users must have at least one location assigned' },
          { status: 400 }
        )
      }
      // If locationIds is not provided, ensure user has existing locations
      if (locationIds === undefined) {
        // Check if user has any locations in junction table
        const userLocations = await prisma.userLocation.count({
          where: { userId: id }
        })
        if (userLocations === 0) {
          return NextResponse.json(
            { error: 'Non-admin users must have at least one location assigned' },
            { status: 400 }
          )
        }
      }
    }

    // Check if removing locations would orphan clients (for trainers and PT managers)
    if ((currentUser.role === 'TRAINER' || currentUser.role === 'PT_MANAGER') && locationIds !== undefined) {
      // Get current locations for this user
      const currentUserLocations = await prisma.userLocation.findMany({
        where: { userId: id },
        select: { locationId: true }
      })
      const currentLocationIds = currentUserLocations.map(ul => ul.locationId)
      
      // Find locations being removed
      const removedLocationIds = currentLocationIds.filter(locId => !locationIds.includes(locId))
      
      // Collect all affected clients across all removed locations
      const allAffectedClients = []
      
      for (const locationId of removedLocationIds) {
        const location = await prisma.location.findUnique({
          where: { id: locationId },
          select: { name: true }
        })
        
        const affectedClients = await prisma.client.findMany({
          where: {
            primaryTrainerId: id,
            locationId: locationId,
            active: true
          },
          select: {
            id: true,
            name: true,
            locationId: true
          }
        })
        
        if (affectedClients.length > 0) {
          allAffectedClients.push(...affectedClients.map(client => ({
            ...client,
            locationName: location?.name || 'Unknown Location'
          })))
        }
      }
      
      // If there are affected clients, return them for reassignment dialog
      if (allAffectedClients.length > 0) {
        return NextResponse.json(
          { 
            error: 'reassignment_required',
            message: `${allAffectedClients.length} client${allAffectedClients.length > 1 ? 's need' : ' needs'} to be reassigned before removing location access.`,
            requiresReassignment: true,
            affectedClients: allAffectedClients,
            removedLocationIds
          },
          { status: 409 } // 409 Conflict - indicates action needed
        )
      }
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (email !== undefined) updateData.email = email
    if (role !== undefined && session.user.role !== 'TRAINER') updateData.role = role
    if (active !== undefined && session.user.role === 'ADMIN') updateData.active = active
    if (commissionProfileId !== undefined) updateData.commissionProfileId = commissionProfileId || null

    // Hash password if provided
    if (password) {
      updateData.password = await bcrypt.hash(password, 12)
    }

    // Update user and manage location associations in a transaction
    const updatedUser = await prisma.$transaction(async (tx) => {
      // Update the user
      const user = await tx.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          active: true,
          updatedAt: true,
        },
      })

      // Handle multi-location updates for all non-admin users
      if (locationIds !== undefined && user.role !== 'ADMIN') {
        // Remove existing UserLocation records
        await tx.userLocation.deleteMany({
          where: { userId: id }
        })

        // Add new UserLocation records
        if (locationIds.length > 0) {
          await tx.userLocation.createMany({
            data: locationIds.map((locId: string) => ({
              userId: id,
              locationId: locId
            }))
          })
        }
      }

      return user
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'USER_UPDATED',
        userId: session.user.id,
        entityType: 'User',
        entityId: updatedUser.id,
        oldValue: currentUser,
        newValue: updateData,
      },
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}

// DELETE /api/users/[id] - Soft delete user
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

    // Only admins can delete users
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Prevent self-deletion
    if (id === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      )
    }

    // Get organization context
    const organizationId = await getOrganizationId()

    // Prevent removing last admin
    const userToDelete = await prisma.user.findUnique({
      where: { 
        id,
        organizationId // Ensure user belongs to same org
      },
      select: { role: true }
    })
    
    if (userToDelete?.role === 'ADMIN') {
      const adminCount = await prisma.user.count({
        where: { 
          role: 'ADMIN',
          active: true,
          organizationId // Count admins in same org
        }
      })
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot deactivate last admin from system' },
          { status: 400 }
        )
      }
    }

    // Check if trainer or PT manager has clients with active packages
    if (userToDelete?.role === 'TRAINER' || userToDelete?.role === 'PT_MANAGER') {
      const clientsWithActivePackages = await prisma.client.count({
        where: {
          primaryTrainerId: id,
          active: true,
          organizationId,
          packages: {
            some: getActivePackageWhereClause()
          }
        }
      })

      if (clientsWithActivePackages > 0) {
        return NextResponse.json(
          {
            error: `Cannot deactivate user: ${clientsWithActivePackages} client${clientsWithActivePackages > 1 ? 's have' : ' has'} active packages. Please reassign ${clientsWithActivePackages > 1 ? 'them' : 'this client'} first.`,
            assignedClients: clientsWithActivePackages
          },
          { status: 400 }
        )
      }

      // Auto-unassign any remaining clients (lost/new - no active packages)
      await prisma.client.updateMany({
        where: {
          primaryTrainerId: id,
          organizationId
        },
        data: { primaryTrainerId: null }
      })
    }

    // Soft delete (set inactive)
    const user = await prisma.user.update({
      where: { id },
      data: { active: false },
      select: {
        id: true,
        email: true,
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'USER_DELETED',
        userId: session.user.id,
        entityType: 'User',
        entityId: user.id,
        oldValue: { email: user.email },
        newValue: { active: false },
      },
    })

    return NextResponse.json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}