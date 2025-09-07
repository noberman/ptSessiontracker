import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// TEMPORARY: Remove this file after migrating staging
export async function GET(request: NextRequest) {
  // Only allow in staging environment
  const isStaging = process.env.NEXTAUTH_URL?.includes('staging') || 
                     process.env.APP_URL?.includes('staging') ||
                     process.env.RAILWAY_ENVIRONMENT === 'staging'
  
  if (!isStaging) {
    return NextResponse.json(
      { error: 'Only allowed in staging environment' },
      { status: 403 }
    )
  }

  try {
    // Run Prisma migrations
    const { stdout, stderr } = await execAsync('npx prisma migrate deploy')
    
    return NextResponse.json({
      success: true,
      message: 'Migrations applied successfully',
      output: stdout,
      errors: stderr || null
    })
  } catch (error: any) {
    console.error('Migration error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to run migrations',
        details: error.message || 'Unknown error',
        output: error.stdout,
        stderr: error.stderr
      },
      { status: 500 }
    )
  }
}