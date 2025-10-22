#!/usr/bin/env npx tsx
/**
 * Enhanced audit script to find ALL packages with session count discrepancies
 * This includes both overflow AND mismatched remaining session counts
 * Run with: npm run audit:discrepancy
 * 
 * For production: DATABASE_URL="your-prod-url" npm run audit:discrepancy
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
  magenta: '\x1b[35m',
  dim: '\x1b[2m',
  bold: '\x1b[1m'
}

async function auditPackageDiscrepancies() {
  console.log(`${colors.blue}${colors.bold}📊 Enhanced Package Discrepancy Audit${colors.reset}\n`)
  console.log(`${colors.dim}Database: ${process.env.DATABASE_URL?.includes('railway') ? 'PRODUCTION' : 'LOCAL'}${colors.reset}\n`)

  try {
    // Step 1: Get ALL packages with their session counts and check for discrepancies
    console.log(`${colors.yellow}Analyzing ALL packages for discrepancies...${colors.reset}`)
    
    // Query to find packages where the math doesn't add up
    const allPackages = await prisma.$queryRaw<any[]>`
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
        COUNT(s.id) FILTER (WHERE s.cancelled = false) as actual_session_count,
        COUNT(s.id) FILTER (WHERE s.validated = true AND s.cancelled = false) as validated_count,
        COUNT(s.id) FILTER (WHERE s.validated = false AND s.cancelled = false) as unvalidated_count,
        COUNT(s.id) FILTER (WHERE s.cancelled = true) as cancelled_count,
        array_agg(s."sessionDate" ORDER BY s."sessionDate") FILTER (WHERE s.cancelled = false) as session_dates,
        -- Calculate what remaining should be based on actual usage
        p."totalSessions" - COUNT(s.id) FILTER (WHERE s.cancelled = false) as calculated_remaining
      FROM packages p
      LEFT JOIN sessions s ON s."packageId" = p.id
      INNER JOIN clients c ON c.id = p."clientId"
      INNER JOIN organizations o ON o.id = p."organizationId"
      GROUP BY p.id, p.name, p."totalSessions", p."remainingSessions", 
               p."totalValue", p."sessionValue", p.active, p."expiresAt",
               c.id, c.name, c.email, o.id, o.name
    `

    // Filter for discrepancies
    const packagesWithIssues = allPackages.filter(pkg => {
      const actualCount = Number(pkg.actual_session_count) || 0
      const totalSessions = pkg.total_sessions || 0
      const remainingSessions = pkg.remaining_sessions || 0
      const calculatedRemaining = Number(pkg.calculated_remaining) || 0
      
      // Check for various types of issues
      const hasOverflow = actualCount > totalSessions
      const hasDiscrepancy = remainingSessions !== calculatedRemaining
      const isNegative = remainingSessions < 0
      
      return hasOverflow || hasDiscrepancy || isNegative
    })

    if (packagesWithIssues.length === 0) {
      console.log(`${colors.green}✅ No packages with discrepancies found!${colors.reset}\n`)
      return
    }

    // Step 2: Categorize issues
    console.log(`${colors.red}⚠️  Found ${packagesWithIssues.length} packages with discrepancies${colors.reset}\n`)
    
    const overflowPackages: any[] = []
    const mismatchPackages: any[] = []
    const negativePackages: any[] = []
    
    packagesWithIssues.forEach(pkg => {
      const actualCount = Number(pkg.actual_session_count) || 0
      const totalSessions = pkg.total_sessions || 0
      const remainingSessions = pkg.remaining_sessions || 0
      const calculatedRemaining = Number(pkg.calculated_remaining) || 0
      
      if (actualCount > totalSessions) {
        overflowPackages.push(pkg)
      }
      if (remainingSessions !== calculatedRemaining && actualCount <= totalSessions) {
        mismatchPackages.push(pkg)
      }
      if (remainingSessions < 0) {
        negativePackages.push(pkg)
      }
    })

    // Step 3: Display detailed results
    if (overflowPackages.length > 0) {
      console.log(`${colors.bold}${colors.red}═══════════════════════════════════════════════════════════════════${colors.reset}`)
      console.log(`${colors.bold}${colors.red} OVERFLOW PACKAGES (Sessions > Total)${colors.reset}`)
      console.log(`${colors.bold}${colors.red}═══════════════════════════════════════════════════════════════════${colors.reset}\n`)
      
      for (const pkg of overflowPackages) {
        const actualCount = Number(pkg.actual_session_count) || 0
        const overflowCount = actualCount - pkg.total_sessions
        
        console.log(`${colors.cyan}Package: ${pkg.package_name}${colors.reset}`)
        console.log(`  Client: ${pkg.client_name} (${pkg.client_email})`)
        console.log(`  Organization: ${pkg.organization_name}`)
        console.log(`  ${colors.red}OVERFLOW: ${actualCount} sessions used / ${pkg.total_sessions} total${colors.reset}`)
        console.log(`  ${colors.red}Extra sessions: ${overflowCount}${colors.reset}`)
        console.log(`  Remaining shown: ${pkg.remaining_sessions}`)
        console.log(`  Validated: ${pkg.validated_count} | Unvalidated: ${pkg.unvalidated_count}`)
        console.log('')
      }
    }

    if (mismatchPackages.length > 0) {
      console.log(`${colors.bold}${colors.yellow}═══════════════════════════════════════════════════════════════════${colors.reset}`)
      console.log(`${colors.bold}${colors.yellow} MISMATCHED REMAINING COUNTS${colors.reset}`)
      console.log(`${colors.bold}${colors.yellow}═══════════════════════════════════════════════════════════════════${colors.reset}\n`)
      
      for (const pkg of mismatchPackages) {
        const actualCount = Number(pkg.actual_session_count) || 0
        const calculatedRemaining = Number(pkg.calculated_remaining) || 0
        
        console.log(`${colors.cyan}Package: ${pkg.package_name}${colors.reset}`)
        console.log(`  Client: ${pkg.client_name} (${pkg.client_email})`)
        console.log(`  Total: ${pkg.total_sessions} | Used: ${actualCount}`)
        console.log(`  ${colors.yellow}Remaining shown: ${pkg.remaining_sessions}${colors.reset}`)
        console.log(`  ${colors.green}Should be: ${calculatedRemaining}${colors.reset}`)
        console.log(`  ${colors.magenta}Difference: ${pkg.remaining_sessions - calculatedRemaining}${colors.reset}`)
        console.log('')
      }
    }

    // Step 4: Look specifically for Li Wen Tan
    console.log(`${colors.bold}${colors.cyan}═══════════════════════════════════════════════════════════════════${colors.reset}`)
    console.log(`${colors.bold}${colors.cyan} SEARCHING FOR LI WEN TAN${colors.reset}`)
    console.log(`${colors.bold}${colors.cyan}═══════════════════════════════════════════════════════════════════${colors.reset}\n`)
    
    const liWenTanPackages = await prisma.$queryRaw<any[]>`
      SELECT 
        p.id,
        p.name,
        p."totalSessions",
        p."remainingSessions",
        c.name as client_name,
        c.email as client_email,
        COUNT(s.id) FILTER (WHERE s.cancelled = false) as sessions_used
      FROM packages p
      INNER JOIN clients c ON c.id = p."clientId"
      LEFT JOIN sessions s ON s."packageId" = p.id
      WHERE LOWER(c.name) LIKE '%li wen tan%' 
         OR LOWER(c.email) LIKE '%tan-li-wen%'
         OR LOWER(c.email) LIKE '%li-wen%'
      GROUP BY p.id, p.name, p."totalSessions", p."remainingSessions", c.name, c.email
    `
    
    if (liWenTanPackages.length > 0) {
      console.log(`${colors.green}Found ${liWenTanPackages.length} package(s) for Li Wen Tan:${colors.reset}\n`)
      for (const pkg of liWenTanPackages) {
        const sessionsUsed = Number(pkg.sessions_used) || 0
        const hasIssue = sessionsUsed > pkg.totalSessions || 
                        (pkg.totalSessions - pkg.remainingSessions) !== sessionsUsed
        
        console.log(`  Package: ${pkg.name}`)
        console.log(`    Total Sessions: ${pkg.totalSessions}`)
        console.log(`    Remaining: ${pkg.remainingSessions}`)
        console.log(`    Actually Used: ${sessionsUsed}`)
        console.log(`    ${hasIssue ? colors.red + '⚠️  HAS DISCREPANCY' : colors.green + '✓ OK'}${colors.reset}`)
        console.log('')
      }
    } else {
      console.log(`${colors.yellow}No packages found for Li Wen Tan${colors.reset}`)
      console.log(`(Searched for variations of the name and email)`)
    }

    // Step 5: Summary
    console.log(`\n${colors.bold}═══════════════════════════════════════════════════════════════════${colors.reset}`)
    console.log(`${colors.bold} SUMMARY${colors.reset}`)
    console.log(`${colors.bold}═══════════════════════════════════════════════════════════════════${colors.reset}\n`)

    console.log(`  ${colors.red}Overflow packages: ${overflowPackages.length}${colors.reset}`)
    console.log(`  ${colors.yellow}Mismatched remaining: ${mismatchPackages.length}${colors.reset}`)
    console.log(`  ${colors.magenta}Negative remaining: ${negativePackages.length}${colors.reset}`)
    console.log(`  ${colors.cyan}Total issues: ${packagesWithIssues.length}${colors.reset}`)
    
    // Calculate financial impact
    let totalOverflowSessions = 0
    let totalOverflowValue = 0
    
    overflowPackages.forEach(pkg => {
      const overflow = Number(pkg.actual_session_count) - pkg.total_sessions
      totalOverflowSessions += overflow
      totalOverflowValue += overflow * (pkg.session_value || 0)
    })
    
    if (totalOverflowSessions > 0) {
      console.log(`\n  ${colors.bold}Financial Impact:${colors.reset}`)
      console.log(`    Overflow sessions: ${totalOverflowSessions}`)
      console.log(`    Overflow value: $${totalOverflowValue.toFixed(2)}`)
    }

  } catch (error) {
    console.error(`${colors.red}Audit failed:${colors.reset}`, error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the audit
console.log(`${colors.dim}Starting enhanced audit...${colors.reset}\n`)
auditPackageDiscrepancies()
  .then(() => {
    console.log(`\n${colors.green}✅ Audit complete${colors.reset}`)
    process.exit(0)
  })
  .catch((error) => {
    console.error(`\n${colors.red}❌ Audit failed${colors.reset}`, error)
    process.exit(1)
  })