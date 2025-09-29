import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Log which database we're connecting to
console.log('🔗 Prisma connecting to:', process.env.DATABASE_URL?.includes('shortline') ? 'LOCAL DB (shortline)' : process.env.DATABASE_URL?.includes('turntable') ? 'STAGING DB (turntable)' : 'UNKNOWN DB')

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma