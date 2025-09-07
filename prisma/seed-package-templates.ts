import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🎁 Seeding package templates...')

  const templates = [
    // Prime Packages
    {
      name: 'Pre-Paid - 12 Prime PT Sessions',
      displayName: '12 Prime PT Sessions',
      category: 'Prime',
      sessions: 12,
      price: 1200.00,
      sessionValue: 100.00,
      sortOrder: 1
    },
    {
      name: 'Pre-Paid - 24 Prime PT Sessions',
      displayName: '24 Prime PT Sessions',
      category: 'Prime',
      sessions: 24,
      price: 2160.00,
      sessionValue: 90.00,
      sortOrder: 2
    },
    {
      name: 'Pre-Paid - 36 Prime PT Sessions',
      displayName: '36 Prime PT Sessions',
      category: 'Prime',
      sessions: 36,
      price: 2880.00,
      sessionValue: 80.00,
      sortOrder: 3
    },
    // Intro Package
    {
      name: '3 PT Session - Intro Pack',
      displayName: '3 Session Intro Pack',
      category: 'Intro',
      sessions: 3,
      price: 138.00,
      sessionValue: 46.00,
      sortOrder: 1  // First in Intro category
    },
    // Transformation Packages
    {
      name: 'Transformation Challenge Credits - 12',
      displayName: 'Transformation Challenge - 12 Credits',
      category: 'Transformation',
      sessions: 12,
      price: 999.00,
      sessionValue: 83.25,
      sortOrder: 1  // First in Transformation category
    },
    {
      name: 'Transformation Challenge Credits - 24',
      displayName: 'Transformation Challenge - 24 Credits',
      category: 'Transformation',
      sessions: 24,
      price: 1799.00,
      sessionValue: 74.96,
      sortOrder: 2  // Second in Transformation category
    },
    // Elite Packages
    {
      name: 'Pre-Paid - 12 Elite PT Sessions',
      displayName: '12 Elite PT Sessions',
      category: 'Elite',
      sessions: 12,
      price: 1440.00,
      sessionValue: 120.00,
      sortOrder: 1  // First in Elite category
    },
    {
      name: 'Pre-Paid - 24 Elite PT Sessions',
      displayName: '24 Elite PT Sessions',
      category: 'Elite',
      sessions: 24,
      price: 2592.00,
      sessionValue: 108.00,
      sortOrder: 2  // Second in Elite category
    },
    {
      name: 'Pre-Paid - 36 Elite PT Sessions',
      displayName: '36 Elite PT Sessions',
      category: 'Elite',
      sessions: 36,
      price: 3456.00,
      sessionValue: 96.00,
      sortOrder: 3  // Third in Elite category
    }
  ]

  // Clear existing templates
  await prisma.packageTemplate.deleteMany({})

  // Create new templates
  for (const template of templates) {
    await prisma.packageTemplate.create({
      data: template
    })
    console.log(`✅ Created template: ${template.displayName}`)
  }

  console.log(`🎉 Successfully created ${templates.length} package templates!`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })