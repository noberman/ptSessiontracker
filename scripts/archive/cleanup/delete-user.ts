import { prisma } from '../../../src/lib/prisma'

async function deleteUser() {
  const email = 'noah@flobit.ai'
  
  try {
    console.log(`🔍 Looking for user with email: ${email}`)
    
    // Find the user first
    const user = await prisma.user.findFirst({
      where: { email },
      include: {
        sessions: true,
        sentInvitations: true,
        assignedClients: true,
      }
    })
    
    if (!user) {
      console.log('❌ User not found')
      return
    }
    
    console.log(`✅ Found user: ${user.name} (ID: ${user.id})`)
    console.log(`   Role: ${user.role}`)
    console.log(`   Organization ID: ${user.organizationId}`)
    console.log(`   Sessions: ${user.sessions.length}`)
    console.log(`   Assigned Clients: ${user.assignedClients.length}`)
    console.log(`   Sent Invitations: ${user.sentInvitations.length}`)
    
    // Delete related data first due to foreign key constraints
    if (user.sessions.length > 0) {
      console.log('🗑️  Deleting sessions...')
      await prisma.session.deleteMany({
        where: { trainerId: user.id }
      })
    }
    
    if (user.sentInvitations.length > 0) {
      console.log('🗑️  Deleting invitations...')
      await prisma.invitation.deleteMany({
        where: { invitedById: user.id }
      })
    }
    
    if (user.assignedClients.length > 0) {
      console.log('🔄 Removing client assignments...')
      await prisma.client.updateMany({
        where: { primaryTrainerId: user.id },
        data: { primaryTrainerId: null }
      })
    }
    
    // Now delete the user
    console.log('🗑️  Deleting user...')
    await prisma.user.delete({
      where: { id: user.id }
    })
    
    console.log('✅ User successfully deleted!')
    
    // Check if organization needs cleanup (if it has no other users)
    if (user.organizationId) {
      const remainingUsers = await prisma.user.count({
        where: { organizationId: user.organizationId }
      })
      
      if (remainingUsers === 0) {
        console.log('🏢 Organization has no remaining users')
        console.log('   You may want to delete the organization as well')
        
        const org = await prisma.organization.findFirst({
          where: { id: user.organizationId }
        })
        
        if (org) {
          console.log(`   Organization: ${org.name} (ID: ${org.id})`)
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error deleting user:', error)
  } finally {
    await prisma.$disconnect()
  }
}

deleteUser()