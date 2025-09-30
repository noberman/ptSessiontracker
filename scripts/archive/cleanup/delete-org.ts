import { prisma } from '../../../src/lib/prisma'

async function deleteOrganization() {
  const orgId = 'cmfzdyxja0000rpeznjtcd22h' // test organization
  
  try {
    console.log(`🔍 Looking for organization with ID: ${orgId}`)
    
    // Find the organization first
    const org = await prisma.organization.findFirst({
      where: { id: orgId },
      include: {
        users: true,
        locations: true,
        clients: true,
        packages: true,
        sessions: true,
        packageTypes: true,
        commissionTiers: true,
        invitations: true,
      }
    })
    
    if (!org) {
      console.log('❌ Organization not found')
      return
    }
    
    console.log(`✅ Found organization: ${org.name}`)
    console.log(`   Users: ${org.users.length}`)
    console.log(`   Locations: ${org.locations.length}`)
    console.log(`   Clients: ${org.clients.length}`)
    console.log(`   Packages: ${org.packages.length}`)
    console.log(`   Sessions: ${org.sessions.length}`)
    console.log(`   Package Types: ${org.packageTypes.length}`)
    console.log(`   Commission Tiers: ${org.commissionTiers.length}`)
    console.log(`   Invitations: ${org.invitations.length}`)
    
    // Delete related data in the correct order
    if (org.sessions.length > 0) {
      console.log('🗑️  Deleting sessions...')
      await prisma.session.deleteMany({
        where: { organizationId: orgId }
      })
    }
    
    if (org.packages.length > 0) {
      console.log('🗑️  Deleting packages...')
      await prisma.package.deleteMany({
        where: { organizationId: orgId }
      })
    }
    
    if (org.clients.length > 0) {
      console.log('🗑️  Deleting clients...')
      await prisma.client.deleteMany({
        where: { organizationId: orgId }
      })
    }
    
    if (org.invitations.length > 0) {
      console.log('🗑️  Deleting invitations...')
      await prisma.invitation.deleteMany({
        where: { organizationId: orgId }
      })
    }
    
    if (org.packageTypes.length > 0) {
      console.log('🗑️  Deleting package types...')
      await prisma.packageType.deleteMany({
        where: { organizationId: orgId }
      })
    }
    
    if (org.commissionTiers.length > 0) {
      console.log('🗑️  Deleting commission tiers...')
      await prisma.commissionTier.deleteMany({
        where: { organizationId: orgId }
      })
    }
    
    if (org.locations.length > 0) {
      console.log('🗑️  Deleting locations...')
      await prisma.location.deleteMany({
        where: { organizationId: orgId }
      })
    }
    
    // Now delete the organization
    console.log('🗑️  Deleting organization...')
    await prisma.organization.delete({
      where: { id: orgId }
    })
    
    console.log('✅ Organization and all related data successfully deleted!')
    console.log('   You can now start fresh with the onboarding wizard!')
    
  } catch (error) {
    console.error('❌ Error deleting organization:', error)
  } finally {
    await prisma.$disconnect()
  }
}

deleteOrganization()