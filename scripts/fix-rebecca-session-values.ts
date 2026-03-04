#!/usr/bin/env npx tsx
/**
 * Fix session values for Rebecca Osban Gonsalves
 * Package Cmix2bozk00riqe3vokj185yq: sessionValue 53.49 → 60.78
 *
 * Run: DATABASE_URL="your-prod-url" npx tsx scripts/fix-rebecca-session-values.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const PACKAGE_ID = 'cmix2bozk00riqe3vokj185yq'
const CORRECT_VALUE = 60.78

async function fix() {
  console.log(`DB: ${process.env.DATABASE_URL?.includes('railway') ? 'PRODUCTION' : 'LOCAL'}\n`)

  // Update package sessionValue
  await prisma.package.update({
    where: { id: PACKAGE_ID },
    data: { sessionValue: CORRECT_VALUE },
  })
  console.log(`Updated package sessionValue to ${CORRECT_VALUE}`)

  // Update all sessions under this package
  const result = await prisma.session.updateMany({
    where: { packageId: PACKAGE_ID },
    data: { sessionValue: CORRECT_VALUE },
  })
  console.log(`Updated ${result.count} sessions to sessionValue ${CORRECT_VALUE}`)

  await prisma.$disconnect()
}

fix().catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1) })
