import { prisma } from '../src/lib/prisma'

async function deleteAllNoahUsers() {
  try {
    console.log(`🔍 Looking for all users with 'noah' in their email...`)
    
    // Find all users with 'noah' in their email
    const users = await prisma.user.findMany({
      where: {
        email: {
          contains: 'noah',
          mode: 'insensitive'
        }
      },
      include: {
        organization: true,
        sessions: true,
        sentInvitations: true,
        assignedClients: true,
      }
    })
    
    if (users.length === 0) {
      console.log('✅ No users found with "noah" in their email')
      return
    }
    
    console.log(`Found ${users.length} user(s) with "noah" in their email:`)
    users.forEach(user => {
      console.log(`  - ${user.name} (${user.email}) - Role: ${user.role}`)
    })
    
    // Delete each user and their related data
    for (const user of users) {
      console.log(`\n🗑️  Deleting user: ${user.email}`)
      
      // Delete sessions
      if (user.sessions.length > 0) {
        const deletedSessions = await prisma.session.deleteMany({
          where: { trainerId: user.id }
        })
        console.log(`   Deleted ${deletedSessions.count} sessions`)
      }
      
      // Delete invitations
      if (user.sentInvitations.length > 0) {
        const deletedInvitations = await prisma.invitation.deleteMany({
          where: { invitedById: user.id }
        })
        console.log(`   Deleted ${deletedInvitations.count} invitations`)
      }
      
      // Remove client assignments
      if (user.assignedClients.length > 0) {
        await prisma.client.updateMany({
          where: { primaryTrainerId: user.id },
          data: { primaryTrainerId: null }
        })
        console.log(`   Removed ${user.assignedClients.length} client assignments`)
      }
      
      // Delete the user
      await prisma.user.delete({
        where: { id: user.id }
      })
      console.log(`   ✅ User deleted`)
      
      // Check if organization needs cleanup
      if (user.organizationId) {
        const remainingUsers = await prisma.user.count({
          where: { organizationId: user.organizationId }
        })
        
        if (remainingUsers === 0) {
          console.log(`   🏢 Organization ${user.organization?.name} has no remaining users`)
          
          // Delete all organization data
          await prisma.session.deleteMany({
            where: { organizationId: user.organizationId }
          })
          await prisma.package.deleteMany({
            where: { organizationId: user.organizationId }
          })
          await prisma.client.deleteMany({
            where: { organizationId: user.organizationId }
          })
          await prisma.invitation.deleteMany({
            where: { organizationId: user.organizationId }
          })
          await prisma.packageType.deleteMany({
            where: { organizationId: user.organizationId }
          })
          await prisma.commissionTier.deleteMany({
            where: { organizationId: user.organizationId }
          })
          await prisma.location.deleteMany({
            where: { organizationId: user.organizationId }
          })
          await prisma.organization.delete({
            where: { id: user.organizationId }
          })
          
          console.log(`   ✅ Organization ${user.organization?.name} deleted`)
        }
      }
    }
    
    console.log(`\n✅ All users with "noah" in their email have been deleted`)
    
  } catch (error) {
    console.error('❌ Error deleting users:', error)
  } finally {
    await prisma.$disconnect()
  }
}

deleteAllNoahUsers()