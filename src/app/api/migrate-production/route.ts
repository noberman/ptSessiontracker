import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { prisma } from '@/lib/prisma'

const execAsync = promisify(exec)

export async function GET(request: NextRequest) {
  // Only allow in production environment
  const isProduction = process.env.NODE_ENV === 'production' && 
                       !process.env.NEXTAUTH_URL?.includes('staging')
  
  if (!isProduction) {
    return NextResponse.json(
      { error: 'Only allowed in production environment' },
      { status: 403 }
    )
  }

  try {
    console.log('Starting production migration with data backup...')
    
    // Step 1: Backup existing package templates (if they exist)
    let packageTemplates: any[] = []
    try {
      packageTemplates = await prisma.packageTemplate.findMany({
        select: {
          name: true,
          displayName: true,
          category: true,
          sessions: true,
          price: true,
          sessionValue: true,
          active: true,
          sortOrder: true
        }
      })
      console.log(`Backed up ${packageTemplates.length} package templates`)
    } catch (e) {
      console.log('No existing package templates to backup')
    }

    // Step 2: Drop EVERYTHING and start fresh
    console.log('Resetting database...')
    await prisma.$executeRaw`DROP SCHEMA public CASCADE`
    await prisma.$executeRaw`CREATE SCHEMA public`
    
    // Step 3: Run Prisma migrations
    console.log('Running migrations...')
    const { stdout, stderr } = await execAsync('npx prisma migrate deploy')
    
    // Step 4: Restore package templates if we had any
    if (packageTemplates.length > 0) {
      console.log('Restoring package templates...')
      for (const template of packageTemplates) {
        await prisma.packageTemplate.create({
          data: template
        })
      }
      console.log(`Restored ${packageTemplates.length} package templates`)
    } else {
      // If no templates existed, seed with default ones
      console.log('Seeding default package templates...')
      const defaultTemplates = [
        // Prime Packages
        {
          name: 'Pre-Paid - 12 Prime PT Sessions',
          displayName: '12 Prime PT Sessions',
          category: 'Prime',
          sessions: 12,
          price: 1200.00,
          sessionValue: 100.00,
          sortOrder: 1
        },
        {
          name: 'Pre-Paid - 24 Prime PT Sessions',
          displayName: '24 Prime PT Sessions',
          category: 'Prime',
          sessions: 24,
          price: 2160.00,
          sessionValue: 90.00,
          sortOrder: 2
        },
        {
          name: 'Pre-Paid - 36 Prime PT Sessions',
          displayName: '36 Prime PT Sessions',
          category: 'Prime',
          sessions: 36,
          price: 2880.00,
          sessionValue: 80.00,
          sortOrder: 3
        },
        // Intro Package
        {
          name: '3 PT Session - Intro Pack',
          displayName: '3 Session Intro Pack',
          category: 'Intro',
          sessions: 3,
          price: 138.00,
          sessionValue: 46.00,
          sortOrder: 1
        },
        // Transformation Packages
        {
          name: 'Transformation Challenge Credits - 12',
          displayName: 'Transformation Challenge - 12 Credits',
          category: 'Transformation',
          sessions: 12,
          price: 999.00,
          sessionValue: 83.25,
          sortOrder: 1
        },
        {
          name: 'Transformation Challenge Credits - 24',
          displayName: 'Transformation Challenge - 24 Credits',
          category: 'Transformation',
          sessions: 24,
          price: 1799.00,
          sessionValue: 74.96,
          sortOrder: 2
        },
        // Elite Packages
        {
          name: 'Pre-Paid - 12 Elite PT Sessions',
          displayName: '12 Elite PT Sessions',
          category: 'Elite',
          sessions: 12,
          price: 1440.00,
          sessionValue: 120.00,
          sortOrder: 1
        },
        {
          name: 'Pre-Paid - 24 Elite PT Sessions',
          displayName: '24 Elite PT Sessions',
          category: 'Elite',
          sessions: 24,
          price: 2592.00,
          sessionValue: 108.00,
          sortOrder: 2
        },
        {
          name: 'Pre-Paid - 36 Elite PT Sessions',
          displayName: '36 Elite PT Sessions',
          category: 'Elite',
          sessions: 36,
          price: 3456.00,
          sessionValue: 96.00,
          sortOrder: 3
        }
      ]
      
      for (const template of defaultTemplates) {
        await prisma.packageTemplate.create({
          data: template
        })
      }
      console.log(`Created ${defaultTemplates.length} default package templates`)
    }
    
    // Step 5: Create admin user for production
    const bcrypt = require('bcryptjs')
    const adminPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'ChangeMe123!', 10)
    
    // Create default location
    const location = await prisma.location.create({
      data: { name: 'FitSync Main' }
    })
    
    // Create admin user
    await prisma.user.create({
      data: {
        email: 'admin@fitsync.com',
        password: adminPassword,
        name: 'Admin',
        role: 'ADMIN',
        locationId: location.id
      }
    })
    
    // Step 6: Verify the migration
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    ` as any[]
    
    const finalTemplateCount = await prisma.packageTemplate.count()
    
    return NextResponse.json({
      success: true,
      message: 'Production migration completed successfully',
      migrationOutput: stdout,
      backedUpTemplates: packageTemplates.length,
      restoredTemplates: finalTemplateCount,
      tables: tables.map((t: any) => t.table_name),
      adminCreated: true,
      note: 'Admin account: admin@fitsync.com (password in environment vars)'
    })
  } catch (error: any) {
    console.error('Production migration error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to run production migration',
        details: error.message,
        stdout: error.stdout,
        stderr: error.stderr
      },
      { status: 500 }
    )
  }
}