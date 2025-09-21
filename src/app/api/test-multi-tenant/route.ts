import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getOrganizationId } from '@/lib/organization-context'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    // Get organization context
    const orgId = await getOrganizationId()
    
    // Test Users filtering
    const users = await prisma.user.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        name: true,
        email: true,
        organizationId: true,
      },
      take: 5,
    })
    
    // Test Locations filtering
    const locations = await prisma.location.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        name: true,
        organizationId: true,
      },
    })
    
    // Test Clients through trainer relationship
    const clients = await prisma.client.findMany({
      where: {
        primaryTrainer: {
          organizationId: orgId
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        primaryTrainer: {
          select: {
            name: true,
            organizationId: true,
          }
        }
      },
      take: 5,
    })
    
    // Count total data in org
    const [userCount, locationCount, clientCount] = await Promise.all([
      prisma.user.count({ where: { organizationId: orgId } }),
      prisma.location.count({ where: { organizationId: orgId } }),
      prisma.client.count({ 
        where: {
          primaryTrainer: {
            organizationId: orgId
          }
        }
      }),
    ])
    
    // Test: Verify we can't see data from other orgs
    const allOrgs = await prisma.organization.findMany({
      select: { id: true, name: true }
    })
    
    const otherOrgId = allOrgs.find(org => org.id !== orgId)?.id
    
    const crossOrgTest = {
      otherOrgExists: !!otherOrgId,
      canSeeOtherOrgUsers: false,
      canSeeOtherOrgLocations: false,
    }
    
    if (otherOrgId) {
      // Try to query other org's data (should return empty)
      const otherOrgUsers = await prisma.user.findMany({
        where: { organizationId: otherOrgId },
        select: { id: true }
      })
      
      const otherOrgLocations = await prisma.location.findMany({
        where: { organizationId: otherOrgId },
        select: { id: true }
      })
      
      // This should NOT filter properly yet - we're testing
      crossOrgTest.canSeeOtherOrgUsers = otherOrgUsers.length > 0
      crossOrgTest.canSeeOtherOrgLocations = otherOrgLocations.length > 0
    }
    
    return NextResponse.json({
      currentOrg: {
        id: orgId,
        user: session.user.name,
        email: session.user.email,
      },
      dataInOrg: {
        users: users.slice(0, 3),
        locations,
        clients: clients.slice(0, 3),
      },
      counts: {
        users: userCount,
        locations: locationCount,
        clients: clientCount,
      },
      isolation: {
        test: 'Can we see other org data?',
        ...crossOrgTest,
        result: !crossOrgTest.canSeeOtherOrgUsers && !crossOrgTest.canSeeOtherOrgLocations 
          ? '✅ ISOLATED - Cannot see other org data' 
          : '❌ LEAK - Can see other org data!'
      }
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}