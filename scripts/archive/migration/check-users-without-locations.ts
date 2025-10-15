#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkUsersWithoutLocations() {
  try {
    // Find non-admin users without any locations
    const usersWithoutLocations = await prisma.user.findMany({
      where: {
        role: { not: 'ADMIN' },
        locations: { none: {} }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        organizationId: true
      }
    })

    if (usersWithoutLocations.length === 0) {
      console.log('✅ Good news: All non-admin users have at least one location assigned')
    } else {
      console.log(`⚠️  Found ${usersWithoutLocations.length} users without any location access:`)
      usersWithoutLocations.forEach(u => {
        console.log(`  - ${u.name} (${u.email})`)
        console.log(`    Role: ${u.role}, Active: ${u.active}, Org: ${u.organizationId}`)
      })
    }

    // Also check admins for informational purposes
    const adminsWithoutLocations = await prisma.user.findMany({
      where: {
        role: 'ADMIN',
        locations: { none: {} }
      },
      select: {
        id: true,
        name: true,
        email: true
      }
    })

    if (adminsWithoutLocations.length > 0) {
      console.log(`\nℹ️  ${adminsWithoutLocations.length} admins without explicit locations (this is OK):`)
      adminsWithoutLocations.forEach(a => {
        console.log(`  - ${a.name} (${a.email})`)
      })
    }

    // Get overall statistics
    const totalUsers = await prisma.user.count({ where: { active: true } })
    const usersWithLocations = await prisma.user.count({
      where: {
        active: true,
        locations: { some: {} }
      }
    })

    console.log(`\n📊 Statistics:`)
    console.log(`  Total active users: ${totalUsers}`)
    console.log(`  Users with location assignments: ${usersWithLocations}`)
    console.log(`  Users without locations: ${totalUsers - usersWithLocations}`)

    return usersWithoutLocations
  } catch (error) {
    console.error('Error checking users:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkUsersWithoutLocations()