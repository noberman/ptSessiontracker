#!/usr/bin/env npx tsx
/**
 * Safe Client Organization Fix Script
 * 
 * This script fixes two issues in production:
 * 1. Deletes duplicate clients with NULL organization (9 Alya's clients)
 * 2. Updates Royce's 6 clients to have the correct organization
 * 
 * Features:
 * - Dry run mode by default
 * - Creates backup data before changes
 * - Transaction support for rollback
 * - Detailed logging
 * - Verification after completion
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

// Configuration
const DRY_RUN = process.argv.includes('--execute') ? false : true
const BACKUP_DIR = path.join(process.cwd(), 'backups')
const ORGANIZATION_ID = 'cmftlg7gx0000rp0ci4as72j0' // The correct org for all these clients

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
})

interface ClientBackup {
  id: string
  name: string
  email: string
  organizationId: string | null
  primaryTrainerId: string | null
  locationId: string
  active: boolean
}

class ClientOrganizationFixer {
  private backup: {
    duplicatesToDelete: ClientBackup[]
    clientsToUpdate: ClientBackup[]
    timestamp: string
  } = {
    duplicatesToDelete: [],
    clientsToUpdate: [],
    timestamp: new Date().toISOString()
  }

  async run() {
    console.log('🔧 Client Organization Fix Script')
    console.log('=' .repeat(60))
    console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN (use --execute to apply)' : '⚠️  EXECUTE MODE'}`)
    console.log(`Target Organization: ${ORGANIZATION_ID}`)
    console.log('')

    try {
      // Step 1: Analyze the situation
      await this.analyze()

      // Step 2: Create backup
      if (!DRY_RUN) {
        await this.createBackup()
      }

      // Step 3: Apply fixes (or show what would be done)
      if (!DRY_RUN) {
        await this.applyFixes()
      }

      // Step 4: Verify results
      await this.verify()

      console.log('\n' + '=' .repeat(60))
      if (DRY_RUN) {
        console.log('✅ Dry run complete. Use --execute to apply these changes.')
      } else {
        console.log('✅ Migration complete!')
        console.log(`📁 Backup saved to: ${this.getBackupPath()}`)
      }

    } catch (error) {
      console.error('\n❌ Error:', error)
      if (!DRY_RUN) {
        console.log('\n🔄 Rolling back changes...')
        await this.rollback()
      }
      process.exit(1)
    } finally {
      await prisma.$disconnect()
    }
  }

  async analyze() {
    console.log('📊 STEP 1: Analyzing clients...\n')

    // Find duplicates to delete
    const duplicatesToDelete = await prisma.$queryRaw<ClientBackup[]>`
      SELECT 
        c.id,
        c.name,
        c.email,
        c."organizationId",
        c."primaryTrainerId",
        c."locationId",
        c.active
      FROM clients c
      WHERE c."organizationId" IS NULL
        AND c.name IN (
          SELECT name
          FROM clients
          GROUP BY name
          HAVING COUNT(*) > 1
            AND COUNT(CASE WHEN "organizationId" IS NOT NULL THEN 1 END) > 0
            AND COUNT(CASE WHEN "organizationId" IS NULL THEN 1 END) > 0
        )
        AND NOT EXISTS (
          SELECT 1
          FROM sessions s
          WHERE s."clientId" = c.id
            AND s.cancelled = false
        )
      ORDER BY c.name
    `

    console.log(`Found ${duplicatesToDelete.length} duplicate clients to DELETE:`)
    duplicatesToDelete.forEach(c => {
      console.log(`  ❌ ${c.name} (${c.email}) - ID: ${c.id}`)
    })

    // Find clients to update
    const clientsToUpdate = await prisma.$queryRaw<Array<ClientBackup & { trainer_name: string }>>`
      SELECT 
        c.id,
        c.name,
        c.email,
        c."organizationId",
        c."primaryTrainerId",
        c."locationId",
        c.active,
        u.name as trainer_name
      FROM clients c
      JOIN users u ON u.id = c."primaryTrainerId"
      WHERE c."organizationId" IS NULL
        AND u."organizationId" = ${ORGANIZATION_ID}
        AND c.id NOT IN (
          SELECT id
          FROM clients
          WHERE "organizationId" IS NULL
            AND name IN (
              SELECT name
              FROM clients
              GROUP BY name
              HAVING COUNT(*) > 1
                AND COUNT(CASE WHEN "organizationId" IS NOT NULL THEN 1 END) > 0
                AND COUNT(CASE WHEN "organizationId" IS NULL THEN 1 END) > 0
            )
            AND NOT EXISTS (
              SELECT 1
              FROM sessions s
              WHERE s."clientId" = clients.id
                AND s.cancelled = false
            )
        )
      ORDER BY c.name
    `

    console.log(`\nFound ${clientsToUpdate.length} clients to UPDATE with organization:`)
    clientsToUpdate.forEach(c => {
      console.log(`  ✏️  ${c.name} (${c.email}) - Trainer: ${c.trainer_name}`)
    })

    // Store for backup
    this.backup.duplicatesToDelete = duplicatesToDelete
    this.backup.clientsToUpdate = clientsToUpdate.map(({ trainer_name, ...client }) => client)

    // Check sessions that might be affected
    if (duplicatesToDelete.length > 0) {
      const sessionCheck = await prisma.$queryRaw<Array<{ name: string, session_count: bigint }>>`
        SELECT c.name, COUNT(s.id) as session_count
        FROM clients c
        LEFT JOIN sessions s ON s."clientId" = c.id AND s.cancelled = false
        WHERE c.id = ANY(${duplicatesToDelete.map(d => d.id)}::text[])
        GROUP BY c.name
        HAVING COUNT(s.id) > 0
      `

      if (sessionCheck.length > 0) {
        console.log('\n⚠️  WARNING: These clients have sessions:')
        sessionCheck.forEach(s => {
          console.log(`  - ${s.name}: ${s.session_count} sessions`)
        })
        throw new Error('Some clients to be deleted have sessions! Aborting.')
      }
    }

    return { duplicatesToDelete, clientsToUpdate }
  }

  async createBackup() {
    console.log('\n📁 STEP 2: Creating backup...\n')

    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true })
    }

    const backupPath = this.getBackupPath()
    fs.writeFileSync(backupPath, JSON.stringify(this.backup, null, 2))
    
    console.log(`✅ Backup saved to: ${backupPath}`)
    console.log(`   - ${this.backup.duplicatesToDelete.length} clients to delete`)
    console.log(`   - ${this.backup.clientsToUpdate.length} clients to update`)
  }

  async applyFixes() {
    console.log('\n🚀 STEP 3: Applying fixes...\n')

    await prisma.$transaction(async (tx) => {
      // First, delete packages for duplicate clients
      if (this.backup.duplicatesToDelete.length > 0) {
        const packageDeleteResult = await tx.$executeRaw`
          DELETE FROM packages
          WHERE "clientId" = ANY(${this.backup.duplicatesToDelete.map(d => d.id)}::text[])
        `
        if (packageDeleteResult > 0) {
          console.log(`🗑️  Deleted ${packageDeleteResult} packages from duplicate clients`)
        }

        // Now delete the duplicate clients
        const deleteResult = await tx.$executeRaw`
          DELETE FROM clients
          WHERE id = ANY(${this.backup.duplicatesToDelete.map(d => d.id)}::text[])
        `
        console.log(`✅ Deleted ${deleteResult} duplicate clients`)
      }

      // Update clients with organization
      if (this.backup.clientsToUpdate.length > 0) {
        const updateResult = await tx.$executeRaw`
          UPDATE clients
          SET "organizationId" = ${ORGANIZATION_ID}
          WHERE id = ANY(${this.backup.clientsToUpdate.map(c => c.id)}::text[])
        `
        console.log(`✅ Updated ${updateResult} clients with organization`)
      }
    })
  }

  async verify() {
    console.log('\n🔍 STEP 4: Verifying results...\n')

    // Check if Royce's clients now have organization
    const royceClients = await prisma.$queryRaw<Array<{ name: string, organizationId: string | null }>>`
      SELECT c.name, c."organizationId"
      FROM clients c
      WHERE c."primaryTrainerId" = 'cmfddbr620007pj0fhvggoyab'
      ORDER BY c.name
    `

    console.log("Royce's clients after migration:")
    royceClients.forEach(c => {
      const status = c.organizationId ? '✅' : '❌'
      console.log(`  ${status} ${c.name} - Org: ${c.organizationId || 'NULL'}`)
    })

    // Check for remaining NULL organizations
    const remainingNull = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM clients c
      JOIN users u ON u.id = c."primaryTrainerId"
      WHERE c."organizationId" IS NULL
        AND u."organizationId" IS NOT NULL
    `

    const nullCount = Number(remainingNull[0].count)
    if (nullCount > 0) {
      console.log(`\n⚠️  Warning: ${nullCount} clients still have NULL organization`)
    } else {
      console.log('\n✅ All clients with trainers now have organizations!')
    }

    // Check for duplicates
    const duplicateCheck = await prisma.$queryRaw<Array<{ name: string, count: bigint }>>`
      SELECT name, COUNT(*) as count
      FROM clients
      WHERE name IN (
        'Evie', 'Samuel Raj Singka', 'Geraldine Lai',
        'Arnizah Abas', 'Avettra Ramesh', 'Carissa Lee Xiu Yan',
        'Farra Aslyn', 'Kehua Liao', 'Nanthini Kunaratnam',
        'Razena Bee Binte Shamsuddin', 'Soh Jun ru'
      )
      GROUP BY name
      HAVING COUNT(*) > 1
    `

    if (duplicateCheck.length > 0) {
      console.log('\n⚠️  Remaining duplicates:')
      duplicateCheck.forEach(d => {
        console.log(`  - ${d.name}: ${d.count} entries`)
      })
    } else {
      console.log('✅ No duplicates remaining for affected clients')
    }
  }

  async rollback() {
    console.log('🔄 Attempting rollback...')
    
    const backupPath = this.getBackupPath()
    if (!fs.existsSync(backupPath)) {
      console.log('❌ No backup file found for rollback')
      return
    }

    const backup = JSON.parse(fs.readFileSync(backupPath, 'utf-8'))
    
    try {
      await prisma.$transaction(async (tx) => {
        // Restore deleted clients
        for (const client of backup.duplicatesToDelete) {
          await tx.client.create({ data: client })
        }
        
        // Restore original organization values (set back to null)
        for (const client of backup.clientsToUpdate) {
          await tx.client.update({
            where: { id: client.id },
            data: { organizationId: null }
          })
        }
      })
      
      console.log('✅ Rollback successful')
    } catch (error) {
      console.error('❌ Rollback failed:', error)
    }
  }

  private getBackupPath(): string {
    const timestamp = this.backup.timestamp.replace(/[:.]/g, '-')
    return path.join(BACKUP_DIR, `client-org-fix-${timestamp}.json`)
  }
}

// Run the script
if (require.main === module) {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required')
    console.log('\nUsage:')
    console.log('  Dry run:  DATABASE_URL="..." npx tsx scripts/fix-client-organizations.ts')
    console.log('  Execute:  DATABASE_URL="..." npx tsx scripts/fix-client-organizations.ts --execute')
    process.exit(1)
  }

  const fixer = new ClientOrganizationFixer()
  fixer.run()
}

export { ClientOrganizationFixer }