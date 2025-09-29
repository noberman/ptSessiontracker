import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanupClones() {
  const clones = await prisma.organization.findMany({
    where: { 
      OR: [
        { name: { contains: 'CLONE_' } },
        { email: { contains: 'clone_' } },
        { isClone: true }
      ]
    },
    select: { id: true, name: true, email: true }
  })
  
  console.log('Found', clones.length, 'clone organizations:')
  clones.forEach(c => console.log(`  - ${c.name} (${c.email})`))
  
  if (clones.length > 0) {
    console.log('\nCleaning up clones...')
    for (const clone of clones) {
      try {
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
        
        // Now delete in correct order
        await prisma.session.deleteMany({ where: { organizationId: clone.id } })
        await prisma.package.deleteMany({ where: { organizationId: clone.id } })
        await prisma.client.deleteMany({ where: { organizationId: clone.id } })
        await prisma.commissionTier.deleteMany({ where: { organizationId: clone.id } })
        await prisma.packageType.deleteMany({ where: { organizationId: clone.id } })
        await prisma.invitation.deleteMany({ where: { organizationId: clone.id } })
        await prisma.user.deleteMany({ where: { organizationId: clone.id } })
        await prisma.location.deleteMany({ where: { organizationId: clone.id } })
        await prisma.organization.delete({ where: { id: clone.id } })
        console.log('✅ Deleted:', clone.name)
      } catch (err: any) {
        console.error('❌ Failed to delete', clone.name, '-', err.message)
      }
    }
    console.log('\nCleanup complete!')
  } else {
    console.log('No clones to clean up')
  }
  
  await prisma.$disconnect()
}

cleanupClones().catch(console.error)