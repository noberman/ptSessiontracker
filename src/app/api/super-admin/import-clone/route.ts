import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/auth/super-admin'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    // Check if in development
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        { error: 'Clone import only available in development' },
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

    const data = await request.json()
    
    // Validate data structure
    if (!data.organization || !data.users || !data.metadata) {
      return NextResponse.json(
        { error: 'Invalid import data structure' },
        { status: 400 }
      )
    }

    console.log('🔄 Starting clone import for:', data.organization.name)

    // Generate clone prefix with timestamp
    const clonePrefix = `CLONE_${Date.now()}_`
    const testPassword = await hash('test123', 10)
    
    let clonedOrg: any = null
    
    try {
      // 1. Create cloned organization
      clonedOrg = await prisma.organization.create({
      data: {
        name: `${clonePrefix}${data.organization.name}`,
        email: `clone_${Date.now()}_${data.organization.email}`,
        subscriptionTier: data.organization.subscriptionTier,
        subscriptionStatus: data.organization.subscriptionStatus || 'ACTIVE',
        commissionMethod: data.organization.commissionMethod,
        stripeCustomerId: null, // Clear payment info
        stripeSubscriptionId: null,
        isClone: true,
        clonedFrom: data.organization.id,
        clonedAt: new Date()
      }
    })

    console.log('✅ Created clone organization:', clonedOrg.name)

    // 2. Create ID mapping for relationships
    const idMap: Record<string, Record<string, string>> = {
      locations: {},
      users: {},
      clients: {},
      packages: {}
    }

    // 3. Clone locations
    if (data.locations && data.locations.length > 0) {
      for (const location of data.locations) {
        const clonedLocation = await prisma.location.create({
          data: {
            name: `${clonePrefix}${location.name}`,
            organizationId: clonedOrg.id,
            active: location.active
          }
        })
        idMap.locations[location.id] = clonedLocation.id
      }
      console.log('✅ Cloned', data.locations.length, 'locations')
    }

    // 4. Clone users
    for (const user of data.users) {
      const clonedUser = await prisma.user.create({
        data: {
          email: `clone_${user.email}`,
          password: testPassword, // All users get same test password
          name: user.name,
          role: user.role,
          organizationId: clonedOrg.id,
          locationId: user.locationId ? idMap.locations[user.locationId] : null,
          active: user.active,
          onboardingCompletedAt: user.onboardingCompletedAt ? new Date(user.onboardingCompletedAt) : null
        }
      })
      idMap.users[user.id] = clonedUser.id
    }
    console.log('✅ Cloned', data.users.length, 'users')

    // 5. Clone clients
    if (data.clients && data.clients.length > 0) {
      for (const client of data.clients) {
        // Build the data object conditionally
        const clientData: any = {
          name: client.name,
          email: `clone_${client.email}`,
          organizationId: clonedOrg.id,
          active: client.active
        }
        
        // Only add locationId if we have a valid mapped location
        if (client.locationId && idMap.locations[client.locationId]) {
          clientData.locationId = idMap.locations[client.locationId]
        } else if (data.locations && data.locations.length > 0) {
          // Use the first location as a fallback
          clientData.locationId = Object.values(idMap.locations)[0]
        } else {
          // Skip this client if no location is available
          console.log('⚠️ Skipping client', client.name, '- no location available')
          continue
        }
        
        // Only add primaryTrainerId if we have a valid mapped trainer
        if (client.primaryTrainerId && idMap.users[client.primaryTrainerId]) {
          clientData.primaryTrainerId = idMap.users[client.primaryTrainerId]
        }
        
        const clonedClient = await prisma.client.create({
          data: clientData
        })
        idMap.clients[client.id] = clonedClient.id
      }
      console.log('✅ Cloned', data.clients.length, 'clients')
    }

    // 6. Clone package types if they exist
    if (data.packageTypes && data.packageTypes.length > 0) {
      for (const packageType of data.packageTypes) {
        await prisma.packageType.create({
          data: {
            name: packageType.name,
            defaultSessions: packageType.defaultSessions,
            defaultPrice: packageType.defaultPrice,
            organizationId: clonedOrg.id,
            active: packageType.active
          }
        })
      }
      console.log('✅ Cloned', data.packageTypes.length, 'package types')
    }

    // 7. Clone packages
    if (data.packages && data.packages.length > 0) {
      for (const pkg of data.packages) {
        const clonedPackage = await prisma.package.create({
          data: {
            clientId: idMap.clients[pkg.clientId],
            organizationId: clonedOrg.id,
            name: pkg.name,
            totalSessions: pkg.totalSessions,
            remainingSessions: pkg.remainingSessions,
            totalValue: pkg.totalValue,
            sessionValue: pkg.sessionValue,
            active: pkg.active
          }
        })
        idMap.packages[pkg.id] = clonedPackage.id
      }
      console.log('✅ Cloned', data.packages.length, 'packages')
    }

    // 8. Clone sessions
    if (data.sessions && data.sessions.length > 0) {
      for (const session of data.sessions) {
        await prisma.session.create({
          data: {
            trainerId: idMap.users[session.trainerId],
            clientId: idMap.clients[session.clientId],
            packageId: session.packageId ? idMap.packages[session.packageId] : null,
            locationId: session.locationId ? idMap.locations[session.locationId] : null,
            organizationId: clonedOrg.id,
            sessionDate: new Date(session.sessionDate),
            sessionValue: session.sessionValue,
            validated: session.validated,
            validatedAt: session.validatedAt ? new Date(session.validatedAt) : null,
            cancelled: session.cancelled || false,
            cancelledAt: session.cancelledAt ? new Date(session.cancelledAt) : null,
            notes: session.notes || null
          }
        })
      }
      console.log('✅ Cloned', data.sessions.length, 'sessions')
    }

    // 9. Clone commission tiers
    if (data.commissionTiers && data.commissionTiers.length > 0) {
      for (const tier of data.commissionTiers) {
        await prisma.commissionTier.create({
          data: {
            organizationId: clonedOrg.id,
            minSessions: tier.minSessions,
            maxSessions: tier.maxSessions,
            percentage: tier.percentage
          }
        })
      }
      console.log('✅ Cloned', data.commissionTiers.length, 'commission tiers')
    }

    // Log the import
    await prisma.adminAuditLog.create({
      data: {
        adminId: session.user.id,
        action: 'IMPORT_CLONE',
        targetOrgId: clonedOrg.id,
        metadata: {
          originalOrgId: data.organization.id,
          originalOrgName: data.organization.name,
          recordCounts: data.metadata.recordCounts
        }
      }
    })

    console.log('🎉 Clone import complete!')

    return NextResponse.json({
      success: true,
      clonedOrg: {
        id: clonedOrg.id,
        name: clonedOrg.name,
        email: clonedOrg.email
      },
      recordCounts: {
        users: data.users.length,
        clients: data.clients?.length || 0,
        sessions: data.sessions?.length || 0,
        packages: data.packages?.length || 0
      },
      testAccounts: data.users.map((u: any) => ({
        email: `clone_${u.email}`,
        password: 'test123',
        role: u.role
      }))
    })
    } catch (importError: any) {
      console.error('Clone import failed, cleaning up...', importError)
      
      // Clean up the partially created clone if it exists
      if (clonedOrg?.id) {
        try {
          console.log('Deleting partial clone:', clonedOrg.name)
          
          // Delete in reverse order of creation
          await prisma.session.deleteMany({ where: { organizationId: clonedOrg.id } })
          await prisma.package.deleteMany({ where: { organizationId: clonedOrg.id } })
          await prisma.client.deleteMany({ where: { organizationId: clonedOrg.id } })
          await prisma.commissionTier.deleteMany({ where: { organizationId: clonedOrg.id } })
          await prisma.packageType.deleteMany({ where: { organizationId: clonedOrg.id } })
          await prisma.user.deleteMany({ where: { organizationId: clonedOrg.id } })
          await prisma.location.deleteMany({ where: { organizationId: clonedOrg.id } })
          await prisma.organization.delete({ where: { id: clonedOrg.id } })
          
          console.log('✅ Cleaned up partial clone')
        } catch (cleanupError) {
          console.error('Failed to cleanup partial clone:', cleanupError)
        }
      }
      
      throw importError
    }
  } catch (error: any) {
    console.error('Clone import error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to import clone' },
      { status: 500 }
    )
  }
}