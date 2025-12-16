import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const isProduction = process.env.NODE_ENV === 'production'

// Log which database we're connecting to (only once)
if (!globalForPrisma.prisma) {
  const dbType = process.env.DATABASE_URL?.includes('shortline')
    ? 'LOCAL DB (shortline)'
    : process.env.DATABASE_URL?.includes('turntable')
      ? 'STAGING DB (turntable)'
      : 'PRODUCTION DB'
  console.log('🔗 Prisma connecting to:', dbType)
}

// Create Prisma client with logging for slow queries
function createPrismaClient() {
  const client = new PrismaClient({
    log: isProduction
      ? [
          { emit: 'event', level: 'query' },
          { emit: 'stdout', level: 'error' },
          { emit: 'stdout', level: 'warn' },
        ]
      : [
          { emit: 'stdout', level: 'query' },
          { emit: 'stdout', level: 'error' },
          { emit: 'stdout', level: 'warn' },
        ],
  })

  // In production, log slow queries (> 500ms)
  if (isProduction) {
    client.$on('query', (e) => {
      if (e.duration > 500) {
        console.log(`[PRISMA] ⚠️ SLOW QUERY (${e.duration}ms): ${e.query.substring(0, 200)}...`)
      }
    })
  }

  return client
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

// Cache in development to prevent hot-reload issues
if (!isProduction) globalForPrisma.prisma = prisma