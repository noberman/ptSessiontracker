#!/usr/bin/env npx tsx
/**
 * Audit script to find all packages with session overflow issues
 * Run with: npm run audit:packages
 * 
 * For production: DATABASE_URL="your-prod-url" npm run audit:packages
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  bold: '\x1b[1m'
}

interface AffectedPackage {
  packageId: string
  packageName: string
  clientId: string
  clientName: string
  clientEmail: string
  organizationId: string
  organizationName: string
  totalSessions: number
  remainingSessions: number
  actualSessionCount: number
  overflowCount: number
  sessionDates: Date[]
  validatedCount: number
  unvalidatedCount: number
  packageValue: number
  overflowValue: number
}

async function auditPackages() {
  console.log(`${colors.blue}${colors.bold}📊 Package Session Overflow Audit${colors.reset}\n`)
  console.log(`${colors.dim}Database: ${process.env.DATABASE_URL?.includes('railway') ? 'PRODUCTION' : 'LOCAL'}${colors.reset}\n`)

  try {
    // Step 1: Find all packages with potential issues
    console.log(`${colors.yellow}Analyzing all packages...${colors.reset}`)
    
    // Get all packages with their session counts
    const packagesWithSessions = await prisma.$queryRaw<any[]>`
      SELECT 
        p.id as package_id,
        p.name as package_name,
        p."totalSessions" as total_sessions,
        p."remainingSessions" as remaining_sessions,
        p."totalValue" as total_value,
        p."sessionValue" as session_value,
        p.active as package_active,
        p."expiresAt" as expires_at,
        c.id as client_id,
        c.name as client_name,
        c.email as client_email,
        o.id as organization_id,
        o.name as organization_name,
        COUNT(s.id) as actual_session_count,
        COUNT(CASE WHEN s.validated = true THEN 1 END) as validated_count,
        COUNT(CASE WHEN s.validated = false THEN 1 END) as unvalidated_count,
        COUNT(CASE WHEN s.cancelled = true THEN 1 END) as cancelled_count,
        array_agg(s."sessionDate" ORDER BY s."sessionDate") as session_dates,
        array_agg(s.id ORDER BY s."sessionDate") as session_ids
      FROM packages p
      LEFT JOIN sessions s ON s."packageId" = p.id AND s.cancelled = false
      INNER JOIN clients c ON c.id = p."clientId"
      INNER JOIN organizations o ON o.id = p."organizationId"
      GROUP BY p.id, p.name, p."totalSessions", p."remainingSessions", 
               p."totalValue", p."sessionValue", p.active, p."expiresAt",
               c.id, c.name, c.email, o.id, o.name
      HAVING COUNT(s.id) > p."totalSessions"
      ORDER BY COUNT(s.id) - p."totalSessions" DESC
    `

    if (packagesWithSessions.length === 0) {
      console.log(`${colors.green}✅ No packages with overflow issues found!${colors.reset}\n`)
      return
    }

    // Step 2: Analyze affected packages
    console.log(`${colors.red}⚠️  Found ${packagesWithSessions.length} packages with overflow issues${colors.reset}\n`)
    
    const affectedPackages: AffectedPackage[] = []
    let totalOverflowSessions = 0
    let totalOverflowValue = 0

    for (const pkg of packagesWithSessions) {
      const overflowCount = Number(pkg.actual_session_count) - pkg.total_sessions
      const overflowValue = overflowCount * (pkg.session_value || 0)
      
      totalOverflowSessions += overflowCount
      totalOverflowValue += overflowValue

      affectedPackages.push({
        packageId: pkg.package_id,
        packageName: pkg.package_name,
        clientId: pkg.client_id,
        clientName: pkg.client_name,
        clientEmail: pkg.client_email,
        organizationId: pkg.organization_id,
        organizationName: pkg.organization_name,
        totalSessions: pkg.total_sessions,
        remainingSessions: pkg.remaining_sessions,
        actualSessionCount: Number(pkg.actual_session_count),
        overflowCount,
        sessionDates: pkg.session_dates || [],
        validatedCount: Number(pkg.validated_count),
        unvalidatedCount: Number(pkg.unvalidated_count),
        packageValue: pkg.total_value,
        overflowValue
      })
    }

    // Step 3: Display detailed results
    console.log(`${colors.bold}═══════════════════════════════════════════════════════════════════${colors.reset}`)
    console.log(`${colors.bold} AFFECTED PACKAGES DETAIL${colors.reset}`)
    console.log(`${colors.bold}═══════════════════════════════════════════════════════════════════${colors.reset}\n`)

    for (const pkg of affectedPackages) {
      console.log(`${colors.cyan}Package: ${pkg.packageName}${colors.reset}`)
      console.log(`  Client: ${pkg.clientName} (${pkg.clientEmail})`)
      console.log(`  Organization: ${pkg.organizationName}`)
      console.log(`  Package ID: ${pkg.packageId}`)
      console.log(`  ${colors.yellow}Sessions: ${pkg.actualSessionCount} used / ${pkg.totalSessions} total${colors.reset}`)
      console.log(`  ${colors.red}OVERFLOW: ${pkg.overflowCount} extra sessions${colors.reset}`)
      console.log(`  Remaining shown: ${pkg.remainingSessions}`)
      console.log(`  Validated: ${pkg.validatedCount} | Unvalidated: ${pkg.unvalidatedCount}`)
      console.log(`  Overflow value: $${pkg.overflowValue.toFixed(2)}`)
      
      // Show when overflow started
      if (pkg.sessionDates.length > pkg.totalSessions) {
        const overflowStartDate = pkg.sessionDates[pkg.totalSessions]
        console.log(`  ${colors.dim}Overflow started: ${new Date(overflowStartDate).toLocaleDateString()}${colors.reset}`)
        
        // Show all overflow session dates
        console.log(`  ${colors.dim}Overflow sessions:${colors.reset}`)
        for (let i = pkg.totalSessions; i < pkg.sessionDates.length; i++) {
          const sessionDate = new Date(pkg.sessionDates[i])
          console.log(`    ${colors.dim}Session ${i + 1}: ${sessionDate.toLocaleDateString()}${colors.reset}`)
        }
      }
      
      console.log('')
    }

    // Step 4: Summary statistics
    console.log(`${colors.bold}═══════════════════════════════════════════════════════════════════${colors.reset}`)
    console.log(`${colors.bold} SUMMARY${colors.reset}`)
    console.log(`${colors.bold}═══════════════════════════════════════════════════════════════════${colors.reset}\n`)

    console.log(`  Total affected packages: ${colors.red}${affectedPackages.length}${colors.reset}`)
    console.log(`  Total overflow sessions: ${colors.red}${totalOverflowSessions}${colors.reset}`)
    console.log(`  Total overflow value: ${colors.red}$${totalOverflowValue.toFixed(2)}${colors.reset}`)
    
    // Group by organization
    const byOrg = affectedPackages.reduce((acc, pkg) => {
      if (!acc[pkg.organizationName]) {
        acc[pkg.organizationName] = {
          count: 0,
          overflowSessions: 0,
          clients: new Set()
        }
      }
      acc[pkg.organizationName].count++
      acc[pkg.organizationName].overflowSessions += pkg.overflowCount
      acc[pkg.organizationName].clients.add(pkg.clientName)
      return acc
    }, {} as Record<string, any>)

    console.log(`\n  ${colors.bold}By Organization:${colors.reset}`)
    for (const [org, data] of Object.entries(byOrg)) {
      console.log(`    ${org}:`)
      console.log(`      - Packages affected: ${data.count}`)
      console.log(`      - Clients affected: ${data.clients.size}`)
      console.log(`      - Overflow sessions: ${data.overflowSessions}`)
    }

    // Step 5: Export to CSV for further analysis
    console.log(`\n${colors.yellow}Generating CSV report...${colors.reset}`)
    
    const csv = [
      'Package ID,Package Name,Client Name,Client Email,Organization,Total Sessions,Used Sessions,Overflow Count,Validated,Unvalidated,Overflow Value,First Overflow Date',
      ...affectedPackages.map(pkg => {
        const firstOverflowDate = pkg.sessionDates[pkg.totalSessions] 
          ? new Date(pkg.sessionDates[pkg.totalSessions]).toISOString().split('T')[0]
          : 'N/A'
        return `"${pkg.packageId}","${pkg.packageName}","${pkg.clientName}","${pkg.clientEmail}","${pkg.organizationName}",${pkg.totalSessions},${pkg.actualSessionCount},${pkg.overflowCount},${pkg.validatedCount},${pkg.unvalidatedCount},${pkg.overflowValue.toFixed(2)},${firstOverflowDate}`
      })
    ].join('\n')

    // Save to file
    const fs = await import('fs')
    const filename = `package-overflow-audit-${new Date().toISOString().split('T')[0]}.csv`
    await fs.promises.writeFile(filename, csv)
    console.log(`${colors.green}✓ Report saved to: ${filename}${colors.reset}`)

    // Step 6: Recommendations
    console.log(`\n${colors.bold}═══════════════════════════════════════════════════════════════════${colors.reset}`)
    console.log(`${colors.bold} RECOMMENDED ACTIONS${colors.reset}`)
    console.log(`${colors.bold}═══════════════════════════════════════════════════════════════════${colors.reset}\n`)

    console.log(`  1. ${colors.yellow}Deploy the API fix immediately${colors.reset} to prevent new overflows`)
    console.log(`  2. ${colors.yellow}Review validated overflow sessions${colors.reset} - these were confirmed by clients`)
    console.log(`  3. ${colors.yellow}Consider options:${colors.reset}`)
    console.log(`     a) Adjust package totals to match actual usage (honor the sessions)`)
    console.log(`     b) Create adjustment invoices for overflow sessions`)
    console.log(`     c) Cancel unvalidated overflow sessions`)
    console.log(`  4. ${colors.yellow}Notify affected clients${colors.reset} about the correction`)

    // Check specific case mentioned
    const liWenTanPackage = affectedPackages.find(p => 
      p.clientName.toLowerCase().includes('li wen tan') || 
      p.clientEmail.toLowerCase().includes('tan-li-wen')
    )
    
    if (liWenTanPackage) {
      console.log(`\n${colors.cyan}✓ Li Wen Tan's package IS in the affected list${colors.reset}`)
    }

  } catch (error) {
    console.error(`${colors.red}Audit failed:${colors.reset}`, error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the audit
console.log(`${colors.dim}Starting audit...${colors.reset}\n`)
auditPackages()
  .then(() => {
    console.log(`\n${colors.green}✅ Audit complete${colors.reset}`)
    process.exit(0)
  })
  .catch((error) => {
    console.error(`\n${colors.red}❌ Audit failed${colors.reset}`, error)
    process.exit(1)
  })