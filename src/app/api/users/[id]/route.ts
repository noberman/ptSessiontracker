import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

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

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        locationId: true,
        location: {
          select: {
            id: true,
            name: true,
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

    if (session.user.role === 'CLUB_MANAGER' && 
        user.locationId !== session.user.locationId &&
        user.id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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
    const { name, email, password, role, locationId, active } = body

    // Get current user
    const currentUser = await prisma.user.findUnique({
      where: { id },
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check permissions
    if (session.user.role === 'TRAINER' && id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (session.user.role === 'CLUB_MANAGER') {
      if (currentUser.locationId !== session.user.locationId && 
          id !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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
          active: true
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

    // Check if email is being changed and if it's unique
    if (email && email !== currentUser.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      })
      if (existingUser) {
        return NextResponse.json(
          { error: 'Email already exists' },
          { status: 400 }
        )
      }
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (email !== undefined) updateData.email = email
    if (role !== undefined && session.user.role !== 'TRAINER') updateData.role = role
    if (locationId !== undefined && session.user.role !== 'TRAINER') updateData.locationId = locationId
    if (active !== undefined && session.user.role === 'ADMIN') updateData.active = active
    
    // Hash password if provided
    if (password) {
      updateData.password = await bcrypt.hash(password, 10)
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        locationId: true,
        active: true,
        updatedAt: true,
      },
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

    // Prevent removing last admin
    const userToDelete = await prisma.user.findUnique({
      where: { id },
      select: { role: true }
    })
    
    if (userToDelete?.role === 'ADMIN') {
      const adminCount = await prisma.user.count({
        where: { 
          role: 'ADMIN',
          active: true
        }
      })
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot deactivate last admin from system' },
          { status: 400 }
        )
      }
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