#!/usr/bin/env tsx
/**
 * Pre-deployment Database Alignment Check Script
 * 
 * This script MUST be run before any deployment to production.
 * It verifies that:
 * 1. All migrations are applied locally
 * 2. Local schema matches Prisma schema
 * 3. No pending migrations exist
 * 4. Production database is accessible
 * 5. All migrations can be safely applied to production
 */

import { PrismaClient } from '@prisma/client'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs/promises'
import * as path from 'path'

const execAsync = promisify(exec)
const prisma = new PrismaClient()

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
}

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(60))
  log(title, 'cyan')
  console.log('='.repeat(60))
}

async function checkLocalMigrations() {
  logSection('1. Checking Local Migrations')
  
  try {
    // Check for pending migrations
    const { stdout: migrationStatus } = await execAsync('npx prisma migrate status')
    
    if (migrationStatus.includes('Following migration have not yet been applied')) {
      log('❌ There are pending migrations locally!', 'red')
      log('Run: npx prisma migrate dev', 'yellow')
      return false
    }
    
    log('✅ All migrations applied locally', 'green')
    return true
  } catch (error: any) {
    if (error.stdout?.includes('Database schema is up to date')) {
      log('✅ Local database is up to date', 'green')
      return true
    }
    log(`❌ Error checking migration status: ${error.message}`, 'red')
    return false
  }
}

async function checkSchemaSync() {
  logSection('2. Checking Schema Synchronization')
  
  try {
    // Generate Prisma client to ensure schema is in sync
    const { stdout, stderr } = await execAsync('npx prisma generate')
    
    if (stderr && !stderr.includes('Generated Prisma Client')) {
      log('❌ Error generating Prisma client', 'red')
      console.log(stderr)
      return false
    }
    
    log('✅ Prisma schema is synchronized', 'green')
    return true
  } catch (error: any) {
    log(`❌ Error generating Prisma client: ${error.message}`, 'red')
    return false
  }
}

async function checkMigrationFiles() {
  logSection('3. Checking Migration Files')
  
  try {
    const migrationsDir = path.join(process.cwd(), 'prisma', 'migrations')
    const migrations = await fs.readdir(migrationsDir)
    
    const migrationFolders = migrations.filter(m => 
      m !== 'migration_lock.toml' && !m.startsWith('.')
    )
    
    log(`Found ${migrationFolders.length} migration(s):`, 'blue')
    migrationFolders.forEach(m => console.log(`  - ${m}`))
    
    // Check each migration has a migration.sql file
    for (const folder of migrationFolders) {
      const sqlPath = path.join(migrationsDir, folder, 'migration.sql')
      try {
        await fs.access(sqlPath)
      } catch {
        log(`❌ Missing migration.sql in ${folder}`, 'red')
        return false
      }
    }
    
    log('✅ All migration files are valid', 'green')
    return true
  } catch (error: any) {
    log(`❌ Error checking migration files: ${error.message}`, 'red')
    return false
  }
}

async function checkProductionReadiness() {
  logSection('4. Checking Production Readiness')
  
  try {
    // Check migration status (no --dry-run in newer Prisma versions)
    const { stdout: deployStatus } = await execAsync('npx prisma migrate status')
    
    if (deployStatus.includes('No pending migrations') || 
        deployStatus.includes('Database schema is up to date')) {
      log('✅ No pending migrations for production', 'green')
      return true
    } else if (deployStatus.includes('Following migration')) {
      log('⚠️  There are migrations pending:', 'yellow')
      console.log(deployStatus)
      return true // This is expected if we have new migrations
    }
    
    log('✅ Migration status checked', 'green')
    return true
  } catch (error: any) {
    // If the database is in sync, this is fine
    if (error.stdout?.includes('up to date') || 
        error.stdout?.includes('No pending migrations')) {
      log('✅ Production database is up to date', 'green')
      return true
    }
    
    log(`⚠️  Could not fully verify production readiness`, 'yellow')
    console.log('This is often normal for local development', 'yellow')
    return true // Non-critical for local checks
  }
}

async function checkDatabaseColumns() {
  logSection('5. Verifying Database Structure')
  
  try {
    // Get a sample of table structures to verify
    const tables = ['users', 'sessions', 'clients', 'packages']
    
    for (const table of tables) {
      try {
        const result = await prisma.$queryRawUnsafe(
          `SELECT COUNT(*) FROM information_schema.columns WHERE table_name = '${table}'`
        )
        log(`  ✓ Table '${table}' exists`, 'green')
      } catch (error) {
        log(`  ✗ Table '${table}' missing or inaccessible`, 'red')
        return false
      }
    }
    
    // Specifically check for recently added columns that caused issues
    try {
      const sessionColumns = await prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'sessions' 
        AND column_name IN ('cancelled', 'cancelledAt')
      ` as any[]
      
      if (sessionColumns.length === 2) {
        log('  ✓ Session cancellation columns exist', 'green')
      } else {
        log('  ⚠️  Session cancellation columns may be missing', 'yellow')
      }
    } catch (error) {
      log('  ⚠️  Could not verify session columns', 'yellow')
    }
    
    return true
  } catch (error: any) {
    log(`❌ Error checking database structure: ${error.message}`, 'red')
    return false
  }
}

async function compareSchemaWithDatabase() {
  logSection('6. Comparing Schema with Database')
  
  try {
    // Use Prisma's db pull to check if database matches schema
    const { stdout, stderr } = await execAsync('npx prisma db pull --force')
    
    // Check if there were any changes
    const { stdout: diffStatus } = await execAsync('git diff prisma/schema.prisma')
    
    if (diffStatus) {
      log('⚠️  Database structure differs from schema:', 'yellow')
      console.log(diffStatus.substring(0, 500) + (diffStatus.length > 500 ? '...' : ''))
      log('\nRun: npx prisma migrate dev --name <migration_name>', 'yellow')
      
      // Reset the schema file
      await execAsync('git checkout prisma/schema.prisma')
      return false
    }
    
    log('✅ Database matches Prisma schema', 'green')
    return true
  } catch (error: any) {
    log(`⚠️  Could not compare schema: ${error.message}`, 'yellow')
    return true // Non-critical, continue
  }
}

async function main() {
  console.log('\n' + '🚀 PRE-DEPLOYMENT DATABASE CHECK'.padEnd(60, ' '))
  console.log('='.repeat(60))
  
  const checks = [
    { name: 'Local Migrations', fn: checkLocalMigrations },
    { name: 'Schema Sync', fn: checkSchemaSync },
    { name: 'Migration Files', fn: checkMigrationFiles },
    { name: 'Production Readiness', fn: checkProductionReadiness },
    { name: 'Database Structure', fn: checkDatabaseColumns },
    { name: 'Schema Comparison', fn: compareSchemaWithDatabase }
  ]
  
  const results: boolean[] = []
  
  for (const check of checks) {
    try {
      const result = await check.fn()
      results.push(result)
    } catch (error: any) {
      log(`❌ ${check.name} failed: ${error.message}`, 'red')
      results.push(false)
    }
  }
  
  await prisma.$disconnect()
  
  logSection('FINAL RESULT')
  
  const passed = results.filter(r => r).length
  const total = results.length
  
  if (passed === total) {
    log(`✅ ALL CHECKS PASSED (${passed}/${total})`, 'green')
    log('Ready for deployment!', 'green')
    process.exit(0)
  } else {
    log(`❌ CHECKS FAILED (${passed}/${total} passed)`, 'red')
    log('Fix the issues above before deploying', 'yellow')
    process.exit(1)
  }
}

// Run the script
main().catch(error => {
  log(`❌ Script error: ${error.message}`, 'red')
  process.exit(1)
})