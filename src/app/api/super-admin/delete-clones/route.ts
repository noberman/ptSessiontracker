import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/auth/super-admin'
import { prisma } from '@/lib/prisma'

export async function DELETE(request: NextRequest) {
  try {
    // Check if in development
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        { error: 'Clone deletion only available in development' },
        { status: 403 }
      )
    }

    // Check super admin
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isAdmin = await isSuperAdmin(session.user.id)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    console.log('🗑️ Starting clone cleanup...')

    // Find all clone organizations
    const clones = await prisma.organization.findMany({
      where: { isClone: true },
      select: { id: true, name: true }
    })

    console.log(`Found ${clones.length} clone organizations to delete`)

    if (clones.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        message: 'No clone organizations found'
      })
    }

    // Delete each clone organization
    let deletedCount = 0
    for (const clone of clones) {
      try {
        console.log(`Deleting clone: ${clone.name}`)
        
        // Get all users in the organization first
        const users = await prisma.user.findMany({
          where: { organizationId: clone.id },
          select: { id: true }
        })
        const userIds = users.map(u => u.id)
        
        // Delete temp auth tokens first (they reference users)
        await prisma.tempAuthToken.deleteMany({
          where: { 
            OR: [
              { userId: { in: userIds } },
              { adminId: { in: userIds } }
            ]
          }
        })
        
        // Delete audit logs
        await prisma.adminAuditLog.deleteMany({
          where: { adminId: { in: userIds } }
        })
        
        // Delete all related data manually to avoid foreign key issues
        await prisma.session.deleteMany({
          where: { organizationId: clone.id }
        })
        
        await prisma.package.deleteMany({
          where: { organizationId: clone.id }
        })
        
        await prisma.client.deleteMany({
          where: { organizationId: clone.id }
        })
        
        await prisma.commissionTier.deleteMany({
          where: { organizationId: clone.id }
        })
        
        await prisma.packageType.deleteMany({
          where: { organizationId: clone.id }
        })
        
        await prisma.invitation.deleteMany({
          where: { organizationId: clone.id }
        })
        
        await prisma.user.deleteMany({
          where: { organizationId: clone.id }
        })
        
        await prisma.location.deleteMany({
          where: { organizationId: clone.id }
        })
        
        // Finally delete the organization
        await prisma.organization.delete({
          where: { id: clone.id }
        })
        
        deletedCount++
        console.log(`✅ Deleted: ${clone.name}`)
      } catch (err: any) {
        console.error(`Failed to delete clone ${clone.name}:`, err)
      }
    }

    // Log the cleanup
    await prisma.adminAuditLog.create({
      data: {
        adminId: session.user.id,
        action: 'DELETE_CLONES',
        metadata: {
          deletedCount,
          cloneNames: clones.map(c => c.name)
        }
      }
    })

    console.log(`🎉 Clone cleanup complete! Deleted ${deletedCount} organizations`)

    return NextResponse.json({
      success: true,
      count: deletedCount,
      message: `Successfully deleted ${deletedCount} clone organizations`
    })
  } catch (error: unknown) {
    console.error('Delete clones error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete clones' },
      { status: 500 }
    )
  }
}