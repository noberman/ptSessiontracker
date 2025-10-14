#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function setupTestData() {
  try {
    console.log('🔍 Checking for trainers with clients at specific locations...\n')
    
    // Find trainers with clients
    const trainersWithClients = await prisma.user.findMany({
      where: {
        role: 'TRAINER',
        active: true,
        assignedClients: {
          some: {
            active: true
          }
        }
      },
      include: {
        assignedClients: {
          where: { active: true },
          select: {
            id: true,
            name: true,
            locationId: true,
            location: {
              select: {
                name: true
              }
            }
          }
        },
        locations: {
          include: {
            location: true
          }
        }
      }
    })

    if (trainersWithClients.length === 0) {
      console.log('No trainers with assigned clients found.')
      console.log('\nTo test the warning, you need:')
      console.log('1. A trainer with multiple location access')
      console.log('2. At least one client assigned to that trainer')
      console.log('3. Try to remove the location where the client is located')
    } else {
      console.log('Found trainers with clients that can be used for testing:\n')
      
      trainersWithClients.forEach(trainer => {
        console.log(`👤 Trainer: ${trainer.name} (${trainer.email})`)
        console.log(`   Locations: ${trainer.locations.map(l => l.location.name).join(', ')}`)
        console.log(`   Assigned clients:`)
        
        // Group clients by location
        const clientsByLocation = trainer.assignedClients.reduce((acc, client) => {
          const locName = client.location.name
          if (!acc[locName]) acc[locName] = []
          acc[locName].push(client.name)
          return acc
        }, {} as Record<string, string[]>)
        
        Object.entries(clientsByLocation).forEach(([location, clients]) => {
          console.log(`     📍 ${location}: ${clients.join(', ')} (${clients.length} client${clients.length > 1 ? 's' : ''})`)
        })
        
        console.log('\n   ⚠️  To test: Try removing this trainer\'s access to any location with clients')
        console.log('')
      })
    }

    // Also show trainers without clients who can be edited freely
    const trainersWithoutClients = await prisma.user.findMany({
      where: {
        role: 'TRAINER',
        active: true,
        assignedClients: {
          none: {}
        }
      },
      include: {
        locations: {
          include: {
            location: true
          }
        }
      }
    })

    if (trainersWithoutClients.length > 0) {
      console.log('Trainers WITHOUT clients (safe to remove locations):')
      trainersWithoutClients.forEach(trainer => {
        console.log(`✅ ${trainer.name} - ${trainer.locations.length} location(s)`)
      })
    }

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

setupTestData()