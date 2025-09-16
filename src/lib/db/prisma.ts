import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Add connection pool parameters to DATABASE_URL if not present
function getDatabaseUrl() {
  const url = process.env.DATABASE_URL
  if (!url) return undefined
  
  // Check if connection pool parameters are already present
  if (url.includes('connection_limit') || url.includes('pool_timeout')) {
    return url
  }
  
  // Add connection pooling parameters for Railway PostgreSQL
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}connection_limit=5&pool_timeout=20&connect_timeout=10`
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasources: {
    db: {
      url: getDatabaseUrl(),
    },
  },
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma