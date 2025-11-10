#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client'
import { createWriteStream } from 'fs'
import { format } from 'date-fns'

const prisma = new PrismaClient()

async function generateSnapFitnessReport() {
  console.log('Generating Snap Fitness Singapore client packages report...')
  
  try {
    // Find Snap Fitness Singapore organization
    const organization = await prisma.organization.findFirst({
      where: {
        name: {
          contains: 'Snap Fitness',
          mode: 'insensitive'
        }
      }
    })
    
    if (!organization) {
      console.error('Snap Fitness Singapore organization not found')
      process.exit(1)
    }
    
    console.log(`Found organization: ${organization.name} (${organization.id})`)
    
    // Get all clients with their packages
    const clients = await prisma.client.findMany({
      where: {
        organizationId: organization.id,
        active: true
      },
      include: {
        packages: {
          where: {
            active: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        location: {
          select: {
            name: true
          }
        },
        primaryTrainer: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })
    
    console.log(`Found ${clients.length} active clients`)
    
    // Create CSV file
    const timestamp = format(new Date(), 'yyyy-MM-dd-HHmm')
    const fileName = `snap-fitness-clients-packages-${timestamp}.csv`
    const writeStream = createWriteStream(fileName)
    
    // Write CSV header
    const headers = [
      'Client Name',
      'Client Email',
      'Location',
      'Primary Trainer',
      'Package Name',
      'Package Type',
      'Total Value',
      'Per Session Value',
      'Total Sessions',
      'Remaining Sessions',
      'Start Date',
      'Expires At',
      'Package Status'
    ]
    
    writeStream.write(headers.join(',') + '\n')
    
    let totalRows = 0
    let clientsWithPackages = 0
    let clientsWithoutPackages = 0
    
    // Write client data
    for (const client of clients) {
      if (client.packages.length === 0) {
        // Client with no packages
        clientsWithoutPackages++
        const row = [
          `"${client.name}"`,
          `"${client.email}"`,
          `"${client.location?.name || 'N/A'}"`,
          `"${client.primaryTrainer?.name || 'N/A'}"`,
          'No Active Package',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          ''
        ]
        writeStream.write(row.join(',') + '\n')
        totalRows++
      } else {
        // Client with packages
        clientsWithPackages++
        for (const pkg of client.packages) {
          const row = [
            `"${client.name}"`,
            `"${client.email}"`,
            `"${client.location?.name || 'N/A'}"`,
            `"${client.primaryTrainer?.name || 'N/A'}"`,
            `"${pkg.name}"`,
            `"${pkg.packageType}"`,
            pkg.totalValue.toFixed(2),
            pkg.sessionValue.toFixed(2),
            pkg.totalSessions.toString(),
            pkg.remainingSessions.toString(),
            pkg.startDate ? format(new Date(pkg.startDate), 'yyyy-MM-dd') : 'N/A',
            pkg.expiresAt ? format(new Date(pkg.expiresAt), 'yyyy-MM-dd') : 'N/A',
            pkg.remainingSessions > 0 ? 'Active' : 'Completed'
          ]
          writeStream.write(row.join(',') + '\n')
          totalRows++
        }
      }
    }
    
    // Write summary
    writeStream.write('\n')
    writeStream.write('SUMMARY\n')
    writeStream.write(`Total Clients,${clients.length}\n`)
    writeStream.write(`Clients with Active Packages,${clientsWithPackages}\n`)
    writeStream.write(`Clients without Active Packages,${clientsWithoutPackages}\n`)
    writeStream.write(`Total Rows,${totalRows}\n`)
    writeStream.write(`Report Generated,${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}\n`)
    
    writeStream.end()
    
    console.log('\n=== REPORT SUMMARY ===')
    console.log(`Total Clients: ${clients.length}`)
    console.log(`Clients with Active Packages: ${clientsWithPackages}`)
    console.log(`Clients without Active Packages: ${clientsWithoutPackages}`)
    console.log(`\nReport saved to: ${fileName}`)
    
    // Calculate some statistics
    const allPackages = clients.flatMap(c => c.packages)
    if (allPackages.length > 0) {
      const totalPackageValue = allPackages.reduce((sum, pkg) => sum + pkg.totalValue, 0)
      const totalRemainingSessions = allPackages.reduce((sum, pkg) => sum + pkg.remainingSessions, 0)
      const averagePackageValue = totalPackageValue / allPackages.length
      
      console.log('\n=== PACKAGE STATISTICS ===')
      console.log(`Total Active Packages: ${allPackages.length}`)
      console.log(`Total Package Value: $${totalPackageValue.toFixed(2)}`)
      console.log(`Average Package Value: $${averagePackageValue.toFixed(2)}`)
      console.log(`Total Remaining Sessions: ${totalRemainingSessions}`)
    }
    
  } catch (error) {
    console.error('Error generating report:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the report
generateSnapFitnessReport()