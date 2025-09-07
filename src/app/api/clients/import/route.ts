import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parse } from 'csv-parse/sync'

interface ImportRow {
  name: string
  email: string
  location: string
  trainerEmail?: string
  packageTemplate: string
  remainingSessions: number
}

interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  row: ImportRow & { rowNumber: number }
  existingClient?: {
    id: string
    name: string
    email: string
  }
  location?: {
    id: string
    name: string
  }
  trainer?: {
    id: string
    name: string
    email: string
  }
  packageTemplate?: {
    id: string
    displayName: string
    sessions: number
    price: number
    sessionValue: number
    category: string
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only managers and admins can import
  if (!['ADMIN', 'PT_MANAGER', 'CLUB_MANAGER'].includes(session.user.role)) {
    return NextResponse.json(
      { error: 'Only managers can import clients' },
      { status: 403 }
    )
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const action = formData.get('action') as string // 'validate' or 'import'
    const trainerAssignments = formData.get('trainerAssignments') 
      ? JSON.parse(formData.get('trainerAssignments') as string) 
      : {}

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Read and parse CSV
    const text = await file.text()
    let records: any[]
    
    try {
      records = parse(text, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      })
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid CSV format' },
        { status: 400 }
      )
    }

    if (records.length === 0) {
      return NextResponse.json(
        { error: 'CSV file is empty' },
        { status: 400 }
      )
    }

    // Validate column headers
    const requiredColumns = [
      'Name', 'Email', 'Location', 'Package Template', 'Remaining Sessions'
    ]
    const optionalColumns = ['Trainer Email']
    
    const headers = Object.keys(records[0])
    const missingColumns = requiredColumns.filter(
      col => !headers.some(h => h.toLowerCase() === col.toLowerCase())
    )

    if (missingColumns.length > 0) {
      return NextResponse.json(
        { error: `Missing required columns: ${missingColumns.join(', ')}` },
        { status: 400 }
      )
    }

    // Normalize column names for processing
    const normalizedRecords = records.map((record, index) => {
      const normalized: any = { rowNumber: index + 2 } // +2 because row 1 is headers
      
      Object.entries(record).forEach(([key, value]) => {
        const lowerKey = key.toLowerCase()
        if (lowerKey === 'name') normalized.name = value
        else if (lowerKey === 'email') normalized.email = (value as string).toLowerCase().trim()
        else if (lowerKey === 'location') normalized.location = value
        else if (lowerKey === 'trainer email') normalized.trainerEmail = (value as string)?.toLowerCase().trim()
        else if (lowerKey === 'package template') normalized.packageTemplate = value
        else if (lowerKey === 'remaining sessions') normalized.remainingSessions = parseInt(value as string)
      })
      
      return normalized as ImportRow & { rowNumber: number }
    })

    // Get locations based on user role
    // Club managers can only import to their own location
    const locationFilter = session.user.role === 'CLUB_MANAGER' && session.user.locationId
      ? { id: session.user.locationId, active: true }
      : { active: true }

    let locations, trainers, existingClients, packageTemplates
    
    try {
      [locations, trainers, existingClients, packageTemplates] = await Promise.all([
        prisma.location.findMany({ where: locationFilter }),
        prisma.user.findMany({ 
          where: { 
            role: 'TRAINER',
            active: true,
            // If club manager, only show trainers from their location
            ...(session.user.role === 'CLUB_MANAGER' && session.user.locationId
              ? { locationId: session.user.locationId }
              : {})
          } 
        }),
        prisma.client.findMany({
          select: { id: true, name: true, email: true }
        }),
        prisma.packageTemplate.findMany({
          where: { active: true }
        })
      ])
    } catch (dbError: any) {
      console.error('Database query error during import validation:', dbError)
      return NextResponse.json(
        { error: 'Failed to load required data. Please ensure package templates are configured.' },
        { status: 500 }
      )
    }

    // Check if we have package templates
    if (!packageTemplates || packageTemplates.length === 0) {
      return NextResponse.json(
        { error: 'No package templates found. Please configure package templates before importing.' },
        { status: 400 }
      )
    }

    const locationMap = Object.fromEntries(
      locations.map(l => [l.name.toLowerCase(), l])
    )
    const trainerMap = Object.fromEntries(
      trainers.map(t => [t.email.toLowerCase(), t])
    )
    const clientMap = Object.fromEntries(
      existingClients.map(c => [c.email.toLowerCase(), c])
    )
    const templateMap = Object.fromEntries(
      packageTemplates.map(t => [t.displayName.toLowerCase(), t])
    )

    // Check for duplicate emails within CSV
    const emailCounts = normalizedRecords.reduce((acc, record) => {
      acc[record.email] = (acc[record.email] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Validate each row
    const validationResults: ValidationResult[] = normalizedRecords.map(row => {
      const errors: string[] = []
      const warnings: string[] = []

      // Required field validation
      if (!row.name) errors.push('Name is required')
      if (!row.email) errors.push('Email is required')
      if (!row.location) errors.push('Location is required')
      if (!row.packageTemplate) errors.push('Package Template is required')
      
      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (row.email && !emailRegex.test(row.email)) {
        errors.push('Invalid email format')
      }

      // Duplicate email in CSV
      if (emailCounts[row.email] > 1) {
        warnings.push(`Email appears ${emailCounts[row.email]} times in CSV`)
      }

      // Location validation
      const location = locationMap[row.location?.toLowerCase()]
      if (row.location && !location) {
        // Provide more helpful error message for club managers
        if (session.user.role === 'CLUB_MANAGER' && session.user.locationId) {
          const userLocation = locations[0]?.name || 'your location'
          errors.push(`Location '${row.location}' not available. You can only import to ${userLocation}`)
        } else {
          errors.push(`Location '${row.location}' not found`)
        }
      }

      // Package template validation
      const packageTemplate = templateMap[row.packageTemplate?.toLowerCase()]
      if (row.packageTemplate && !packageTemplate) {
        errors.push(`Package template '${row.packageTemplate}' not found. Available templates: ${packageTemplates.map(t => t.displayName).join(', ')}`)
      }

      // Trainer validation (optional)
      let trainer = undefined
      if (row.trainerEmail) {
        // Check manual assignments first
        const assignedTrainerId = trainerAssignments[row.email]
        if (assignedTrainerId) {
          trainer = trainers.find(t => t.id === assignedTrainerId)
        } else {
          trainer = trainerMap[row.trainerEmail]
          if (!trainer) {
            warnings.push(`Trainer '${row.trainerEmail}' not found - assign manually`)
          }
        }
      } else {
        // Check if manually assigned
        const assignedTrainerId = trainerAssignments[row.email]
        if (assignedTrainerId) {
          trainer = trainers.find(t => t.id === assignedTrainerId)
        } else {
          warnings.push('No trainer assigned')
        }
      }

      // Numeric validation
      if (isNaN(row.remainingSessions) || row.remainingSessions < 0) {
        errors.push('Remaining sessions must be a positive number')
      }

      // Logical validation - remaining sessions cannot exceed package template sessions
      if (packageTemplate && row.remainingSessions > packageTemplate.sessions) {
        errors.push(`Remaining sessions (${row.remainingSessions}) cannot exceed package size (${packageTemplate.sessions})`)
      }

      // Check if client exists
      const existingClient = clientMap[row.email?.toLowerCase()]
      if (existingClient) {
        warnings.push(`Client exists - will add package to existing client`)
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        row,
        existingClient,
        location,
        trainer,
        packageTemplate
      }
    })

    // If action is validate, return validation results
    if (action === 'validate') {
      const summary = {
        totalRows: validationResults.length,
        validRows: validationResults.filter(r => r.valid).length,
        invalidRows: validationResults.filter(r => !r.valid).length,
        warningRows: validationResults.filter(r => r.warnings.length > 0).length,
        existingClients: validationResults.filter(r => r.existingClient).length,
        newClients: validationResults.filter(r => r.valid && !r.existingClient).length,
        needsTrainer: validationResults.filter(r => r.valid && !r.trainer).length,
        totalPackageValue: validationResults
          .filter(r => r.valid && r.packageTemplate)
          .reduce((sum, r) => sum + r.packageTemplate!.price, 0)
      }

      return NextResponse.json({
        action: 'validate',
        summary,
        results: validationResults,
        locations: locations.map(l => ({ id: l.id, name: l.name })),
        trainers: trainers.map(t => ({ 
          id: t.id, 
          name: t.name, 
          email: t.email,
          locationId: t.locationId 
        })),
        packageTemplates: packageTemplates.map(t => ({
          id: t.id,
          displayName: t.displayName,
          sessions: t.sessions,
          price: t.price
        }))
      })
    }

    // If action is import, process the import
    if (action === 'import') {
      const validRows = validationResults.filter(r => r.valid)
      
      if (validRows.length === 0) {
        return NextResponse.json(
          { error: 'No valid rows to import' },
          { status: 400 }
        )
      }

      const importBatchId = `import_${Date.now()}`
      const importResults = {
        created: { clients: 0, packages: 0 },
        updated: { clients: 0 },
        failed: [] as any[],
        successful: [] as any[]
      }

      // Process each valid row
      for (const result of validRows) {
        try {
          await prisma.$transaction(async (tx) => {
            let client

            if (result.existingClient) {
              // Update existing client
              client = await tx.client.update({
                where: { id: result.existingClient.id },
                data: {
                  name: result.row.name,
                  locationId: result.location!.id,
                  primaryTrainerId: result.trainer?.id,
                  updatedAt: new Date()
                }
              })
              importResults.updated.clients++
            } else {
              // Create new client
              client = await tx.client.create({
                data: {
                  name: result.row.name,
                  email: result.row.email,
                  locationId: result.location!.id,
                  primaryTrainerId: result.trainer?.id,
                  active: true
                }
              })
              importResults.created.clients++
            }

            // Create package using template data
            const pkg = await tx.package.create({
              data: {
                clientId: client.id,
                name: result.packageTemplate!.displayName,
                packageType: result.packageTemplate!.category,
                totalSessions: result.packageTemplate!.sessions,
                remainingSessions: result.row.remainingSessions,
                totalValue: result.packageTemplate!.price,
                sessionValue: result.packageTemplate!.sessionValue,
                active: true,
                startDate: new Date(),
              }
            })
            importResults.created.packages++

            importResults.successful.push({
              client: client.name,
              email: client.email,
              package: pkg.name,
              remainingSessions: pkg.remainingSessions
            })
          })
        } catch (error: any) {
          importResults.failed.push({
            row: result.row.rowNumber,
            email: result.row.email,
            error: error.message
          })
        }
      }

      return NextResponse.json({
        action: 'import',
        batchId: importBatchId,
        summary: {
          processed: validRows.length,
          successful: importResults.successful.length,
          failed: importResults.failed.length,
          clientsCreated: importResults.created.clients,
          clientsUpdated: importResults.updated.clients,
          packagesCreated: importResults.created.packages
        },
        results: importResults
      })
    }

    return NextResponse.json(
      { error: 'Invalid action specified' },
      { status: 400 }
    )

  } catch (error: any) {
    console.error('Import error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process import' },
      { status: 500 }
    )
  }
}

// Download template endpoint
export async function GET() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get all active package templates to create examples
  const packageTemplates = await prisma.packageTemplate.findMany({
    where: { active: true },
    orderBy: [
      { category: 'asc' },
      { sortOrder: 'asc' }
    ]
  })

  // Get all active locations for examples
  const locations = await prisma.location.findMany({
    where: { active: true },
    take: 4
  })

  // Sample trainer emails
  const trainerEmails = [
    'trainer1@gym.com',
    'trainer2@gym.com',
    '',  // Some without trainer
    'trainer3@gym.com'
  ]

  // Sample client names
  const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emma', 'Robert', 'Lisa', 'James', 'Maria']
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez']

  // Build CSV with header
  let csv = 'Name,Email,Location,Trainer Email,Package Template,Remaining Sessions\n'

  // Add one row for each package template
  packageTemplates.forEach((template, index) => {
    const firstName = firstNames[index % firstNames.length]
    const lastName = lastNames[index % lastNames.length]
    const name = `${firstName} ${lastName}`
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`
    const location = locations[index % locations.length]?.name || 'Wood Square'
    const trainerEmail = trainerEmails[index % trainerEmails.length]
    // Remaining sessions should be less than or equal to total sessions
    const remainingSessions = Math.floor(Math.random() * template.sessions) + 1
    
    csv += `${name},${email},${location},${trainerEmail},${template.displayName},${remainingSessions}\n`
  })

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="client_import_template.csv"'
    }
  })
}