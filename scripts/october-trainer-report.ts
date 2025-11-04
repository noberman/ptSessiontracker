#!/usr/bin/env npx tsx
/**
 * October 2024 Trainer Report Script
 * Generates a CSV report showing trainer sessions and values by location
 * 
 * Usage: 
 * For production: DATABASE_URL="postgresql://[PROD_URL]:44961/railway" npx tsx scripts/october-trainer-report.ts
 * For staging: DATABASE_URL="postgresql://[STAGING_URL]:24999/railway" npx tsx scripts/october-trainer-report.ts
 */

import { PrismaClient } from '@prisma/client'
import { writeFileSync } from 'fs'
import { join } from 'path'

const prisma = new PrismaClient()

async function generateOctoberReport() {
  console.log('🔍 Fetching October 2025 trainer session data...')
  
  // Define October 2025 date range
  const startDate = new Date('2025-10-01T00:00:00.000Z')
  const endDate = new Date('2025-10-31T23:59:59.999Z')
  
  try {
    // First, get all trainers who had sessions in October
    const trainersWithSessions = await prisma.user.findMany({
      where: {
        role: {
          in: ['TRAINER', 'PT_MANAGER']
        },
        sessions: {
          some: {
            sessionDate: {
              gte: startDate,
              lte: endDate
            }
          }
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        organizationId: true
      },
      orderBy: {
        name: 'asc'
      }
    })
    
    console.log(`📊 Found ${trainersWithSessions.length} trainers with October sessions`)
    
    // Get all locations for column headers
    const locations = await prisma.location.findMany({
      select: {
        id: true,
        name: true
      },
      orderBy: {
        name: 'asc'
      }
    })
    
    console.log(`📍 Found ${locations.length} locations`)
    
    // Build the report data
    const reportData: any[] = []
    
    for (const trainer of trainersWithSessions) {
      console.log(`Processing ${trainer.name}...`)
      
      // Get all sessions for this trainer in October
      const sessions = await prisma.session.findMany({
        where: {
          trainerId: trainer.id,
          sessionDate: {
            gte: startDate,
            lte: endDate
          }
        },
        select: {
          id: true,
          sessionValue: true,
          locationId: true,
          validated: true,
          cancelled: true
        }
      })
      
      // Calculate totals and breakdown by location
      const locationBreakdown: Record<string, { count: number; value: number; validatedCount: number }> = {}
      let totalSessions = 0
      let totalValue = 0
      let totalValidated = 0
      
      // Initialize all locations with zeros
      for (const location of locations) {
        locationBreakdown[location.id] = {
          count: 0,
          value: 0,
          validatedCount: 0
        }
      }
      
      // Process each session
      for (const session of sessions) {
        if (!session.cancelled) {
          totalSessions++
          totalValue += session.sessionValue
          
          if (session.validated) {
            totalValidated++
          }
          
          if (session.locationId) {
            locationBreakdown[session.locationId].count++
            locationBreakdown[session.locationId].value += session.sessionValue
            if (session.validated) {
              locationBreakdown[session.locationId].validatedCount++
            }
          }
        }
      }
      
      // Build row data
      const rowData: any = {
        'Trainer Name': trainer.name,
        'Email': trainer.email,
        'Role': trainer.role === 'PT_MANAGER' ? 'PT Manager' : 'Trainer',
        'Total Sessions': totalSessions,
        'Total Validated': totalValidated,
        'Validation Rate': totalSessions > 0 ? `${((totalValidated / totalSessions) * 100).toFixed(1)}%` : '0%',
        'Total Value': `$${totalValue.toFixed(2)}`
      }
      
      // Add location-specific columns
      for (const location of locations) {
        const locationData = locationBreakdown[location.id]
        const locationName = location.name.replace(/,/g, ' ') // Remove commas for CSV
        
        rowData[`${locationName} - Sessions`] = locationData.count
        rowData[`${locationName} - Validated`] = locationData.validatedCount
        rowData[`${locationName} - Value`] = locationData.value > 0 ? `$${locationData.value.toFixed(2)}` : '$0.00'
      }
      
      reportData.push(rowData)
    }
    
    // Add totals row
    const totalsRow: any = {
      'Trainer Name': 'TOTALS',
      'Email': '',
      'Role': '',
      'Total Sessions': 0,
      'Total Validated': 0,
      'Validation Rate': '',
      'Total Value': 0
    }
    
    // Initialize location totals
    for (const location of locations) {
      const locationName = location.name.replace(/,/g, ' ')
      totalsRow[`${locationName} - Sessions`] = 0
      totalsRow[`${locationName} - Validated`] = 0
      totalsRow[`${locationName} - Value`] = 0
    }
    
    // Calculate totals
    for (const row of reportData) {
      totalsRow['Total Sessions'] += row['Total Sessions']
      totalsRow['Total Validated'] += row['Total Validated']
      
      // Parse currency values for totaling
      const value = parseFloat(row['Total Value'].replace('$', '').replace(',', ''))
      totalsRow['Total Value'] += value
      
      for (const location of locations) {
        const locationName = location.name.replace(/,/g, ' ')
        totalsRow[`${locationName} - Sessions`] += row[`${locationName} - Sessions`]
        totalsRow[`${locationName} - Validated`] += row[`${locationName} - Validated`]
        const locValue = parseFloat(row[`${locationName} - Value`].replace('$', '').replace(',', ''))
        totalsRow[`${locationName} - Value`] += locValue
      }
    }
    
    // Format totals row
    totalsRow['Validation Rate'] = totalsRow['Total Sessions'] > 0 
      ? `${((totalsRow['Total Validated'] / totalsRow['Total Sessions']) * 100).toFixed(1)}%`
      : '0%'
    totalsRow['Total Value'] = `$${totalsRow['Total Value'].toFixed(2)}`
    
    for (const location of locations) {
      const locationName = location.name.replace(/,/g, ' ')
      const value = totalsRow[`${locationName} - Value`]
      totalsRow[`${locationName} - Value`] = `$${value.toFixed(2)}`
    }
    
    reportData.push(totalsRow)
    
    // Generate CSV
    console.log('📝 Generating CSV file...')
    
    const headers = Object.keys(reportData[0])
    const csvLines = [
      headers.join(','),
      ...reportData.map(row => 
        headers.map(header => {
          const value = row[header]
          // Escape values containing commas or quotes
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`
          }
          return value
        }).join(',')
      )
    ]
    
    const csv = csvLines.join('\n')
    
    // Save to file
    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `october-2025-trainer-report-${timestamp}.csv`
    const filepath = join(process.cwd(), filename)
    
    writeFileSync(filepath, csv)
    
    console.log(`✅ Report saved to: ${filename}`)
    console.log(`📊 Report contains ${trainersWithSessions.length} trainers across ${locations.length} locations`)
    console.log(`📈 Total sessions in October: ${totalsRow['Total Sessions']}`)
    console.log(`💰 Total value: ${totalsRow['Total Value']}`)
    console.log(`✓ Overall validation rate: ${totalsRow['Validation Rate']}`)
    
  } catch (error) {
    console.error('❌ Error generating report:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
generateOctoberReport()