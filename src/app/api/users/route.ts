import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUserAccessibleLocations } from '@/lib/user-locations'
import bcrypt from 'bcryptjs'
import { getOrganizationId } from '@/lib/organization-context'
import { canAddTrainer } from '@/lib/usage-limits'

// GET /api/users - List all users with pagination and filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only managers and admins can view user list
    if (!['CLUB_MANAGER', 'PT_MANAGER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role') || ''
    const locationId = searchParams.get('locationId') || ''
    
    const skip = (page - 1) * limit

    // Get organization context
    const organizationId = await getOrganizationId()
    
    const where: any = {
      active: true,
      organizationId, // Filter by organization
      // Hide super admin from regular users table
      NOT: {
        role: 'SUPER_ADMIN'
      }
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (role) {
      where.role = role
    }

    if (locationId) {
      // Filter users who have access to this location through UserLocation
      where.locations = {
        some: {
          locationId: locationId
        }
      }
    }

    // Restrict club managers and PT managers to their accessible locations
    if (session.user.role === 'CLUB_MANAGER' || session.user.role === 'PT_MANAGER') {
      const accessibleLocations = await getUserAccessibleLocations(session.user.id, session.user.role)
      if (accessibleLocations && accessibleLocations.length > 0) {
        // Show users who have access to any of the manager's accessible locations
        where.locations = {
          some: {
            locationId: { in: accessibleLocations }
          }
        }
      } else {
        // No accessible locations
        where.id = 'no-access'
      }
    }
    // ADMIN sees all (no additional filter)

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
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
                  name: true,
                },
              },
            },
          },
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          name: 'asc',
        },
      }),
      prisma.user.count({ where }),
    ])

    // Transform users to maintain backward compatibility
    const transformedUsers = users.map(user => ({
      ...user,
      location: user.locations?.[0]?.location || null,
      locations: undefined, // Remove the junction table from response
    }))

    return NextResponse.json({
      users: transformedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

// POST /api/users - Create new user
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only managers and admins can create users
    if (!['CLUB_MANAGER', 'PT_MANAGER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { name, email, password, role, locationId, locationIds, commissionProfileId } = body

    // Validate required fields
    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate that non-admin users have at least one location
    if (role !== 'ADMIN') {
      const hasLocations = (locationIds && locationIds.length > 0) || locationId
      if (!hasLocations) {
        return NextResponse.json(
          { error: 'Non-admin users must be assigned to at least one location' },
          { status: 400 }
        )
      }
    }

    // Get organization context
    const organizationId = await getOrganizationId()
    
    // Check if email exists in ANY organization (not just current one)
    const existingUserAnyOrg = await prisma.user.findFirst({
      where: { email },
      select: { 
        organizationId: true,
        organization: { 
          select: { name: true } 
        }
      }
    })

    if (existingUserAnyOrg) {
      // Email exists - check if it's in current org or different org
      if (existingUserAnyOrg.organizationId === organizationId) {
        return NextResponse.json(
          { error: 'Email already exists in this organization' },
          { status: 400 }
        )
      } else {
        // Email exists in a different organization
        console.log(`❌ Blocked manual creation: ${email} already exists in org ${existingUserAnyOrg.organization?.name}`)
        return NextResponse.json(
          { 
            error: 'This email is already registered with another organization. Please use email invitation to add them to your organization.',
            requiresInvitation: true,
            existingOrganization: existingUserAnyOrg.organization?.name 
          },
          { status: 400 }
        )
      }
    }

    // Check usage limits if creating a trainer
    if (role === 'TRAINER') {
      if (!organizationId) {
        return NextResponse.json(
          { error: 'Organization not found' },
          { status: 400 }
        )
      }

      const canAdd = await canAddTrainer(organizationId)
      if (!canAdd.allowed) {
        return NextResponse.json(
          { 
            error: canAdd.reason,
            needsUpgrade: true,
            usage: canAdd.usage 
          },
          { status: 403 }
        )
      }
    }

    // Club managers can only create trainers in their location
    if (session.user.role === 'CLUB_MANAGER') {
      if (role !== 'TRAINER') {
        return NextResponse.json(
          { error: 'Club managers can only create trainers' },
          { status: 403 }
        )
      }
      // Check if club manager has access to the specified location
      const manager = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { locations: true }
      })
      const hasAccess = manager?.locations.some(l => l.locationId === locationId)
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Can only create users in your location' },
          { status: 403 }
        )
      }
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user with multi-location support in a transaction
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role,
          organizationId, // Set organization for new user
          commissionProfileId: commissionProfileId || null,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          active: true,
          createdAt: true,
        },
      })

      // Create UserLocation records for all non-admin users
      if (locationIds && locationIds.length > 0 && role !== 'ADMIN') {
        await tx.userLocation.createMany({
          data: locationIds.map((locId: string) => ({
            userId: newUser.id,
            locationId: locId
          }))
        })

        // If primary locationId is set, ensure it's also in UserLocation
        if (locationId && !locationIds.includes(locationId)) {
          await tx.userLocation.create({
            data: {
              userId: newUser.id,
              locationId: locationId
            }
          })
        }
      }

      return newUser
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'USER_CREATED',
        userId: session.user.id,
        entityType: 'User',
        entityId: user.id,
        newValue: {
          email: user.email,
          role: user.role,
        },
      },
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}