/**
 * Migration script to create default PackageTypes for existing organizations
 * and map existing packages to the new types
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const DEFAULT_PACKAGE_TYPES = [
  {
    name: 'basic',
    displayName: 'Basic Package',
    description: 'Entry-level training package',
    defaultSessions: 5,
    defaultPrice: 250,
    sortOrder: 1
  },
  {
    name: 'standard',
    displayName: 'Standard Package',
    description: 'Standard training package',
    defaultSessions: 10,
    defaultPrice: 450,
    sortOrder: 2
  },
  {
    name: 'premium',
    displayName: 'Premium Package',
    description: 'Premium training package with more sessions',
    defaultSessions: 20,
    defaultPrice: 800,
    sortOrder: 3
  },
  {
    name: 'elite',
    displayName: 'Elite Package',
    description: 'Elite training package for committed clients',
    defaultSessions: 30,
    defaultPrice: 1100,
    sortOrder: 4
  },
  {
    name: 'custom',
    displayName: 'Custom Package',
    description: 'Customized package tailored to specific needs',
    defaultSessions: null,
    defaultPrice: null,
    sortOrder: 5
  }
]

async function main() {
  console.log('🚀 Starting PackageType migration...')

  try {
    // Get all organizations
    const organizations = await prisma.organization.findMany()
    console.log(`Found ${organizations.length} organization(s)`)

    for (const org of organizations) {
      console.log(`\n📦 Processing organization: ${org.name}`)

      // Check if PackageTypes already exist
      const existingTypes = await prisma.packageType.count({
        where: { organizationId: org.id }
      })

      if (existingTypes > 0) {
        console.log(`  ✅ PackageTypes already exist (${existingTypes} types)`)
        continue
      }

      // Create default PackageTypes for this organization
      console.log('  Creating default PackageTypes...')
      const createdTypes = await prisma.packageType.createMany({
        data: DEFAULT_PACKAGE_TYPES.map(type => ({
          ...type,
          organizationId: org.id
        }))
      })
      console.log(`  ✅ Created ${createdTypes.count} PackageTypes`)

      // Get the created types for mapping
      const packageTypes = await prisma.packageType.findMany({
        where: { organizationId: org.id }
      })

      const typeMap = new Map(packageTypes.map(pt => [pt.name.toLowerCase(), pt.id]))

      // Map existing packages to new PackageTypes
      const packages = await prisma.package.findMany({
        where: {
          client: {
            primaryTrainer: {
              organizationId: org.id
            }
          }
        }
      })

      console.log(`  Found ${packages.length} packages to migrate`)

      let mappedCount = 0
      for (const pkg of packages) {
        let packageTypeId: string | null = null

        // Map based on existing packageType string
        const typeString = pkg.packageType?.toLowerCase()
        if (typeString === 'prime' || typeString === 'premium') {
          packageTypeId = typeMap.get('premium') || null
        } else if (typeString === 'elite') {
          packageTypeId = typeMap.get('elite') || null
        } else if (typeString === 'basic') {
          packageTypeId = typeMap.get('basic') || null
        } else if (typeString === 'standard') {
          packageTypeId = typeMap.get('standard') || null
        } else {
          // Default to custom for unrecognized types
          packageTypeId = typeMap.get('custom') || null
        }

        if (packageTypeId) {
          await prisma.package.update({
            where: { id: pkg.id },
            data: { packageTypeId }
          })
          mappedCount++
        }
      }

      console.log(`  ✅ Mapped ${mappedCount} packages to new PackageTypes`)
    }

    console.log('\n✅ PackageType migration completed successfully!')

  } catch (error) {
    console.error('❌ Error during migration:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(console.error)