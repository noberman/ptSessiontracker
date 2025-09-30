import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parse } from 'csv-parse/sync'

interface ImportRow {
  name: string
  email: string
  phone?: string
  location: string
  trainerEmail?: string
  packageName: string
  totalSessions: number
  remainingSessions: number
  totalValue: number
  sessionValue?: number
  expiryDate?: Date
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
  packageType?: {
    id: string
    name: string
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
    const locationAssignments = formData.get('locationAssignments')
      ? JSON.parse(formData.get('locationAssignments') as string)
      : {}
    const packageTypeAssignments = formData.get('packageTypeAssignments')
      ? JSON.parse(formData.get('packageTypeAssignments') as string)
      : {}
    const duplicateHandling = formData.get('duplicateHandling') as string || 'skip' // 'skip' or 'overwrite'

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
      console.log(`Parsed ${records.length} records from CSV`)
      console.log('First record headers:', Object.keys(records[0]))
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
      'Name', 'Email', 'Location', 'Package Name', 'Total Sessions', 'Remaining Sessions', 'Total Value'
    ]
    const optionalColumns = ['Phone', 'Trainer Email', 'Session Value', 'Expiry Date']
    
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

    // Filter out empty rows (rows where all values are empty strings)
    const nonEmptyRecords = records.filter(record => {
      const hasContent = Object.values(record).some(value => 
        value && String(value).trim() !== ''
      )
      return hasContent
    })
    
    console.log(`Filtered to ${nonEmptyRecords.length} non-empty records`)
    
    // Normalize column names for processing
    const normalizedRecords = nonEmptyRecords.map((record, index) => {
      console.log(`\n=== Processing Row ${index + 2} ===`)
      console.log('Raw record:', record)
      
      const normalized: any = { rowNumber: index + 2 } // +2 because row 1 is headers
      
      Object.entries(record).forEach(([key, value]) => {
        const lowerKey = key.toLowerCase()
        console.log(`Field: "${key}" -> "${value}"`)
        if (lowerKey === 'name') normalized.name = value
        else if (lowerKey === 'email') normalized.email = (value as string).toLowerCase().trim()
        else if (lowerKey === 'phone') normalized.phone = (value as string)?.trim() || undefined
        else if (lowerKey === 'location') normalized.location = value
        else if (lowerKey === 'trainer email') normalized.trainerEmail = (value as string)?.toLowerCase().trim()
        else if (lowerKey === 'package name') normalized.packageName = value
        else if (lowerKey === 'total sessions') normalized.totalSessions = parseInt(value as string)
        else if (lowerKey === 'remaining sessions') normalized.remainingSessions = parseInt(value as string)
        else if (lowerKey === 'total value') {
          // Handle currency formatting ($1,200 -> 1200)
          const cleanValue = (value as string).replace(/[$,]/g, '').trim()
          normalized.totalValue = parseFloat(cleanValue)
        }
        else if (lowerKey === 'session value') {
          // Handle currency formatting
          const cleanValue = value ? (value as string).replace(/[$,]/g, '').trim() : undefined
          normalized.sessionValue = cleanValue ? parseFloat(cleanValue) : undefined
        }
        else if (lowerKey === 'expiry date') {
          if (value) {
            // Handle DD/MM/YYYY or DD/MM/YY format
            const dateStr = (value as string).trim()
            console.log(`  Parsing date: "${dateStr}"`)
            
            if (dateStr.includes('/')) {
              const [day, month, yearPart] = dateStr.split('/')
              console.log(`  Date parts: day="${day}", month="${month}", year="${yearPart}"`)
              
              // Handle 2-digit year (assume 20xx for years 00-50, 19xx for 51-99)
              let year = yearPart.trim()
              if (year.length === 2) {
                const yearNum = parseInt(year)
                year = yearNum <= 50 ? `20${year}` : `19${year}`
                console.log(`  Converted 2-digit year ${yearPart} to ${year}`)
              }
              
              // Create date as YYYY-MM-DD to avoid ambiguity
              const dateString = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
              console.log(`  Creating date from: ${dateString}`)
              const parsedDate = new Date(dateString)
              console.log(`  Parsed date: ${parsedDate}`)
              normalized.expiryDate = isNaN(parsedDate.getTime()) ? undefined : parsedDate
            } else {
              // Try standard date parsing for other formats
              const parsedDate = new Date(dateStr)
              normalized.expiryDate = isNaN(parsedDate.getTime()) ? undefined : parsedDate
            }
          } else {
            normalized.expiryDate = undefined
          }
        }
      })
      
      console.log('Normalized record:', normalized)
      return normalized as ImportRow & { rowNumber: number }
    })

    // Get locations based on user role
    // Club managers can only import to their own location
    const locationFilter = session.user.role === 'CLUB_MANAGER' && session.user.locationId
      ? { id: session.user.locationId, active: true }
      : { active: true }

    // Get organization context
    const organizationId = session.user.organizationId || 'default'
    
    let locations, trainers, existingClients, packageTypes, existingPackages
    
    try {
      [locations, trainers, existingClients, packageTypes, existingPackages] = await Promise.all([
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
          where: { organizationId },
          select: { 
            id: true, 
            name: true, 
            email: true,
            locationId: true,
            primaryTrainerId: true
          }
        }),
        prisma.packageType.findMany({
          where: { 
            organizationId,
            isActive: true 
          }
        }),
        prisma.package.findMany({
          where: { active: true },
          select: { 
            clientId: true, 
            name: true,
            remainingSessions: true 
          }
        })
      ])
    } catch (dbError: any) {
      console.error('Database query error during import validation:', dbError)
      return NextResponse.json(
        { error: 'Failed to load required data.' },
        { status: 500 }
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
    // Map package types by name for matching
    const packageTypeMap = Object.fromEntries(
      packageTypes.map(t => [t.name.toLowerCase(), t])
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

      // Required field validation - check for actual content, not just truthy values
      if (!row.name || row.name.trim() === '') errors.push('Name is required')
      if (!row.email || row.email.trim() === '') errors.push('Email is required')
      if (!row.location || row.location.trim() === '') errors.push('Location is required')
      if (!row.packageName || row.packageName.trim() === '') errors.push('Package Name is required')
      if (!row.totalSessions || isNaN(row.totalSessions)) errors.push('Total Sessions is required and must be a number')
      if (!row.totalValue || isNaN(row.totalValue)) errors.push('Total Value is required and must be a number')
      
      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (row.email && !emailRegex.test(row.email)) {
        errors.push('Invalid email format')
      }

      // Duplicate email in CSV
      if (emailCounts[row.email] > 1) {
        warnings.push(`Email appears ${emailCounts[row.email]} times in CSV`)
      }

      // Location validation - check manual assignment first
      let location = undefined
      const assignedLocationId = locationAssignments[row.email]
      if (assignedLocationId) {
        location = locations.find(l => l.id === assignedLocationId)
      } else {
        location = locationMap[row.location?.toLowerCase()]
      }
      
      if (!location && row.location) {
        // Provide more helpful error message for club managers
        if (session.user.role === 'CLUB_MANAGER' && session.user.locationId) {
          const userLocation = locations[0]?.name || 'your location'
          errors.push(`Location '${row.location}' not available. You can only import to ${userLocation}`)
        } else {
          errors.push(`Location '${row.location}' not found`)
        }
      }

      // Check if package type has been manually assigned or matches a defined PackageType
      let matchedPackageType = undefined
      const assignedPackageTypeId = packageTypeAssignments[row.email]
      if (assignedPackageTypeId) {
        matchedPackageType = packageTypes.find(t => t.id === assignedPackageTypeId)
      } else {
        matchedPackageType = packageTypeMap[row.packageName?.toLowerCase()]
      }
      
      if (!matchedPackageType && packageTypes.length > 0) {
        warnings.push(`Package "${row.packageName}" doesn't match any defined package types. Will create as custom package. Available types: ${packageTypes.map(t => t.name).join(', ')}`)
      }

      // Trainer validation (REQUIRED)
      let trainer = undefined
      
      // Check manual assignments first
      const assignedTrainerId = trainerAssignments[row.email]
      if (assignedTrainerId) {
        trainer = trainers.find(t => t.id === assignedTrainerId)
        if (!trainer) {
          console.error(`Assigned trainer ${assignedTrainerId} not found for ${row.email}`)
          errors.push('Assigned trainer not found')
        }
      } else if (row.trainerEmail) {
        trainer = trainerMap[row.trainerEmail]
        if (!trainer) {
          errors.push(`Trainer '${row.trainerEmail}' not found - please select a trainer`)
        }
      }
      
      // If still no trainer, it's an error (trainer is required)
      if (!trainer) {
        errors.push('Trainer is required - please assign a trainer')
      }

      // Numeric validation
      if (isNaN(row.totalSessions) || row.totalSessions < 0) {
        errors.push('Total sessions must be a positive number')
      }
      if (isNaN(row.remainingSessions) || row.remainingSessions < 0) {
        errors.push('Remaining sessions must be a positive number')
      }
      if (isNaN(row.totalValue) || row.totalValue < 0) {
        errors.push('Total value must be a positive number')
      }
      if (row.sessionValue !== undefined && (isNaN(row.sessionValue) || row.sessionValue < 0)) {
        errors.push('Session value must be a positive number')
      }

      // Logical validation - remaining sessions cannot exceed total sessions
      if (row.remainingSessions > row.totalSessions) {
        errors.push(`Remaining sessions (${row.remainingSessions}) cannot exceed total sessions (${row.totalSessions})`)
      }

      // Check if client exists and has existing packages
      const existingClient = clientMap[row.email?.toLowerCase()]
      if (existingClient) {
        warnings.push(`Client already exists - location/trainer will be updated if changed`)
        
        // Check if client already has a package with this name
        const clientPackages = existingPackages.filter(p => p.clientId === existingClient.id)
        const matchingPackage = clientPackages.find(p => p.name === row.packageName)
        
        if (matchingPackage) {
          warnings.push(`Client already has "${row.packageName}" with ${matchingPackage.remainingSessions} sessions remaining.`)
        } else {
          warnings.push(`Will create new package "${row.packageName}" for existing client`)
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        row,
        existingClient,
        location,
        trainer,
        packageType: matchedPackageType
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
          .filter(r => r.valid)
          .reduce((sum, r) => sum + r.row.totalValue, 0)
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
        packageTypes: packageTypes.map(t => ({
          id: t.id,
          name: t.name,
          defaultSessions: t.defaultSessions,
          defaultPrice: t.defaultPrice
        }))
      })
    }

    // If action is import, process the import
    if (action === 'import') {
      const validRows = validationResults.filter(r => r.valid)
      
      console.log(`Starting import: ${validRows.length} valid rows to import`)
      console.log('Duplicate handling mode:', duplicateHandling)
      console.log('Location assignments:', locationAssignments)
      console.log('Trainer assignments:', trainerAssignments)
      
      if (validRows.length === 0) {
        return NextResponse.json(
          { error: 'No valid rows to import' },
          { status: 400 }
        )
      }

      const importBatchId = `import_${Date.now()}`
      const importResults = {
        created: { clients: 0, packages: 0 },
        updated: { clients: 0, packages: 0 },
        failed: [] as any[],
        successful: [] as any[]
      }

      // Process each valid row
      for (const result of validRows) {
        console.log(`Processing import for: ${result.row.email} - ${result.row.name}`)
        console.log(`  Location: ${result.location?.name} (${result.location?.id})`)
        console.log(`  Trainer: ${result.trainer?.name} (${result.trainer?.id})`)
        try {
          await prisma.$transaction(async (tx) => {
            let client

            if (result.existingClient) {
              // Update existing client's location and trainer if provided
              const updateData: any = {}
              
              // Only update location if it's different from current
              if (result.location && result.location.id !== result.existingClient.locationId) {
                updateData.locationId = result.location.id
                console.log(`Updating client location to: ${result.location.name}`)
              }
              
              // Only update trainer if it's different from current
              if (result.trainer && result.trainer.id !== result.existingClient.primaryTrainerId) {
                updateData.primaryTrainerId = result.trainer.id
                console.log(`Updating client trainer to: ${result.trainer.name}`)
              } else if (!result.trainer && result.existingClient.primaryTrainerId) {
                // Clear trainer if none selected but client has one
                updateData.primaryTrainerId = null
                console.log(`Clearing client trainer`)
              }
              
              // Update client if there are changes
              if (Object.keys(updateData).length > 0) {
                client = await tx.client.update({
                  where: { id: result.existingClient.id },
                  data: updateData
                })
                console.log(`Updated existing client: ${client.id} - ${client.name}`)
                importResults.updated.clients++
              } else {
                client = result.existingClient
                console.log(`Using existing client without changes: ${client.id} - ${client.name}`)
              }
            } else {
              // Create new client
              client = await tx.client.create({
                data: {
                  name: result.row.name,
                  email: result.row.email,
                  phone: result.row.phone || null,
                  locationId: result.location!.id,
                  primaryTrainerId: result.trainer?.id,
                  organizationId: session.user.organizationId!, // Add organizationId
                  active: true
                }
              })
              console.log(`Created client: ${client.id} - ${client.name}`)
              importResults.created.clients++
            }

            // Check if client already has an active package with the same name
            const existingPackage = await tx.package.findFirst({
              where: {
                clientId: client.id,
                name: result.row.packageName,
                active: true
              }
            })

            if (existingPackage) {
              // Package with same name already exists for this client
              if (duplicateHandling === 'overwrite') {
                // Overwrite the existing package with new values
                const pkg = await tx.package.update({
                  where: { id: existingPackage.id },
                  data: {
                    totalSessions: result.row.totalSessions,
                    remainingSessions: result.row.remainingSessions,
                    totalValue: result.row.totalValue,
                    sessionValue: result.row.sessionValue || (result.row.totalValue / result.row.totalSessions),
                    expiresAt: result.row.expiryDate || null,
                    updatedAt: new Date()
                  }
                })
                console.log(`Overwrote package: ${pkg.id} - ${pkg.name} for client ${client.name}`)
                importResults.updated.packages = (importResults.updated.packages || 0) + 1
              } else {
                // Skip duplicate package (default behavior)
                console.log(`Skipping duplicate package: ${existingPackage.name} for client ${client.name} - already exists`)
                importResults.updated.packages = (importResults.updated.packages || 0) + 1
              }
            } else {
              // Create new package
              const sessionValue = result.row.sessionValue || (result.row.totalValue / result.row.totalSessions)
              
              // If package name matches a PackageType, use it; otherwise default to Custom
              const pkg = await tx.package.create({
                data: {
                  clientId: client.id,
                  name: result.row.packageName,
                  packageType: result.packageType?.name || "Custom",
                  packageTypeId: result.packageType?.id || null,
                  totalSessions: result.row.totalSessions,
                  remainingSessions: result.row.remainingSessions,
                  totalValue: result.row.totalValue,
                  sessionValue: sessionValue,
                  organizationId: session.user.organizationId!, // Add organizationId
                  active: true,
                  startDate: new Date(),
                  expiresAt: result.row.expiryDate || null,
                }
              })
              console.log(`Created package: ${pkg.id} - ${pkg.name} for client ${client.name}`)
              importResults.created.packages++
            }

            importResults.successful.push({
              client: client.name,
              email: client.email,
              package: result.row.packageName,
              remainingSessions: result.row.remainingSessions,
              action: existingPackage ? 'Updated existing package' : 'Created new package'
            })
          })
        } catch (error: any) {
          console.error(`Failed to import ${result.row.email}:`, error.message)
          console.error('Full error:', error)
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
          packagesCreated: importResults.created.packages,
          packagesUpdated: importResults.updated.packages
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

  const organizationId = session.user.organizationId || 'default'

  // Get all active package types to create examples
  const packageTypes = await prisma.packageType.findMany({
    where: { 
      organizationId,
      isActive: true 
    },
    orderBy: [
      { sortOrder: 'asc' },
      { name: 'asc' }
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
  let csv = 'Name,Email,Phone,Location,Trainer Email,Package Name,Total Sessions,Remaining Sessions,Total Value,Session Value,Expiry Date\n'

  // Generate sample data rows using actual package types if available
  let samplePackages = []
  
  if (packageTypes.length > 0) {
    // Use actual package types from the organization
    samplePackages = packageTypes.slice(0, 6).map((type, index) => ({
      name: type.name,
      sessions: type.defaultSessions || (10 + index * 5),
      value: type.defaultPrice || (1000 + index * 200)
    }))
  } else {
    // Fallback to generic examples
    samplePackages = [
      { name: '10 Session PT Package', sessions: 10, value: 1000 },
      { name: 'Group Training Monthly', sessions: 12, value: 360 },
      { name: '20 Session PT Package', sessions: 20, value: 1800 },
      { name: 'Custom Training Plan', sessions: 15, value: 1350 },
      { name: '5 Session Starter Pack', sessions: 5, value: 450 },
      { name: 'Group Fitness Weekly', sessions: 8, value: 240 },
    ]
  }

  samplePackages.forEach((pkg, index) => {
    const firstName = firstNames[index % firstNames.length]
    const lastName = lastNames[index % lastNames.length]
    const name = `${firstName} ${lastName}`
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`
    const phone = index % 2 === 0 ? `+1555000${1000 + index}` : '' // Add phone for some records
    const location = locations[index % locations.length]?.name || 'Wood Square'
    const trainerEmail = index < 4 ? `trainer${(index % 3) + 1}@gym.com` : '' // Some without trainer
    const remainingSessions = Math.floor(Math.random() * pkg.sessions) + 1
    const sessionValue = (pkg.value / pkg.sessions).toFixed(2)
    const expiryDate = index % 3 === 0 ? '' : new Date(Date.now() + (90 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0] // Some without expiry
    
    csv += `${name},${email},${phone},${location},${trainerEmail},${pkg.name},${pkg.sessions},${remainingSessions},${pkg.value},${sessionValue},${expiryDate}\n`
  })

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="client_import_template.csv"'
    }
  })
}