import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanupTestData() {
  console.log('🧹 Starting database cleanup...')
  
  try {
    // Start a transaction to ensure all or nothing
    await prisma.$transaction(async (tx) => {
      
      // 1. Delete all sessions (they reference old packages)
      const deletedSessions = await tx.session.deleteMany({})
      console.log(`✅ Deleted ${deletedSessions.count} sessions`)
      
      // 2. Delete all packages (they don't use templates)
      const deletedPackages = await tx.package.deleteMany({})
      console.log(`✅ Deleted ${deletedPackages.count} packages`)
      
      // 3. Delete test clients (emails with example.com, test, or common test patterns)
      const deletedClients = await tx.client.deleteMany({
        where: {
          OR: [
            { email: { contains: 'example.com' } },
            { email: { contains: 'test' } },
            { email: { contains: '@email.com' } },
            { email: { contains: '@gmail.com' } },
            { email: { contains: '@yahoo.com' } },
            { email: { contains: '@hotmail.com' } },
            { email: { contains: '@outlook.com' } },
          ]
        }
      })
      console.log(`✅ Deleted ${deletedClients.count} test clients`)
      
      // 4. Delete email logs from testing
      const deletedEmails = await tx.emailLog.deleteMany({})
      console.log(`✅ Deleted ${deletedEmails.count} email logs`)
      
      // 5. Delete audit logs (optional - you might want to keep these)
      // const deletedAudits = await tx.auditLog.deleteMany({})
      // console.log(`✅ Deleted ${deletedAudits.count} audit logs`)
      
    })
    
    console.log('✨ Database cleanup complete!')
    
    // Show what remains
    const [clientCount, userCount, locationCount, templateCount] = await Promise.all([
      prisma.client.count(),
      prisma.user.count(),
      prisma.location.count(),
      prisma.packageTemplate.count(),
    ])
    
    console.log('\n📊 Remaining data:')
    console.log(`  - Clients: ${clientCount}`)
    console.log(`  - Users: ${userCount}`)
    console.log(`  - Locations: ${locationCount}`)
    console.log(`  - Package Templates: ${templateCount}`)
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run if this is the main module
if (require.main === module) {
  cleanupTestData()
}

export { cleanupTestData }