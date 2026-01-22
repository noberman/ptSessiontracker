/**
 * Migration Script: Add payment records for existing packages
 *
 * This script creates a single payment record for each existing package,
 * assuming all current packages are fully paid.
 *
 * Usage:
 *   npx tsx scripts/migrate-existing-packages-to-payments.ts
 *
 * For production:
 *   DATABASE_URL="..." npx tsx scripts/migrate-existing-packages-to-payments.ts
 */

import { prisma } from '../src/lib/prisma'

async function migrateExistingPackagesToPayments() {
  console.log('Starting migration: Adding payment records for existing packages...')

  // Get all packages that don't have any payments yet
  const packagesWithoutPayments = await prisma.package.findMany({
    where: {
      payments: {
        none: {}
      }
    },
    select: {
      id: true,
      totalValue: true,
      startDate: true,
      createdAt: true,
      name: true,
      client: {
        select: { name: true }
      }
    }
  })

  console.log(`Found ${packagesWithoutPayments.length} packages without payment records`)

  if (packagesWithoutPayments.length === 0) {
    console.log('No packages need migration. Exiting.')
    await prisma.$disconnect()
    return
  }

  // Create payment records in batches
  const batchSize = 100
  let created = 0

  for (let i = 0; i < packagesWithoutPayments.length; i += batchSize) {
    const batch = packagesWithoutPayments.slice(i, i + batchSize)

    const paymentData = batch.map(pkg => ({
      packageId: pkg.id,
      amount: pkg.totalValue,
      paymentDate: pkg.startDate || pkg.createdAt,
      notes: 'Initial payment (migrated from existing package)'
    }))

    await prisma.payment.createMany({
      data: paymentData
    })

    created += batch.length
    console.log(`Progress: ${created}/${packagesWithoutPayments.length} packages migrated`)
  }

  console.log(`\nMigration complete! Created ${created} payment records.`)

  // Verify
  const totalPayments = await prisma.payment.count()
  console.log(`Total payment records in database: ${totalPayments}`)

  await prisma.$disconnect()
}

migrateExistingPackagesToPayments()
  .catch((error) => {
    console.error('Migration failed:', error)
    process.exit(1)
  })
