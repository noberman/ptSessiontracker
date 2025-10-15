import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { 
  calculateMonthlyCommissions, 
  getCommissionMethod,
  formatCommissionForExport,
  CommissionMethod
} from '@/lib/commission/calculator'
import { parse } from 'date-fns'
import { format } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Only managers and admins can export
    if (!['CLUB_MANAGER', 'PT_MANAGER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const { searchParams } = new URL(request.url)
    const monthParam = searchParams.get('month') // Format: YYYY-MM
    const locationId = searchParams.get('locationId')
    const methodParam = searchParams.get('method') as CommissionMethod | null
    
    console.log('Commission export - Request params:', {
      monthParam,
      locationId,
      methodParam,
      userRole: session.user.role,
      organizationId: session.user.organizationId
    })
    
    // Parse month or use current month
    const month = monthParam 
      ? parse(monthParam, 'yyyy-MM', new Date())
      : new Date()
    
    console.log('Commission export - Parsed month:', month)
    
    // Get commission method
    const method = methodParam || await getCommissionMethod()
    
    console.log('Commission export - Method:', method)
    
    // Calculate commissions
    const commissions = await calculateMonthlyCommissions(
      month,
      locationId || undefined,
      method
    )
    
    console.log('Commission export - Commissions calculated:', {
      count: commissions.length,
      trainers: commissions.map(c => ({ name: c.trainerName, sessions: c.totalSessions }))
    })
    
    // Format for export
    const exportData = formatCommissionForExport(commissions)
    
    // Convert to CSV
    if (exportData.length === 0) {
      return new NextResponse('No data to export', { status: 404 })
    }
    
    // Get headers from first row
    const headers = Object.keys(exportData[0])
    
    // Build CSV content
    let csv = headers.join(',') + '\n'
    
    for (const row of exportData) {
      const values = headers.map(header => {
        const value = row[header as keyof typeof row]
        // Escape commas and quotes in values
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value
      })
      csv += values.join(',') + '\n'
    }
    
    // Add summary row
    const totalSessions = commissions.reduce((sum, c) => sum + c.totalSessions, 0)
    const totalValue = commissions.reduce((sum, c) => sum + c.totalValue, 0)
    const totalCommission = commissions.reduce((sum, c) => sum + c.commissionAmount, 0)
    
    csv += '\n'
    csv += `TOTALS,,${commissions.length} trainers,${totalSessions},,`
    csv += `"$${totalValue.toFixed(2)}",,`
    csv += `"$${totalCommission.toFixed(2)}"\n`
    
    // Add metadata
    csv += '\n'
    csv += `Generated:,"${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}"\n`
    csv += `Period:,"${format(month, 'MMMM yyyy')}"\n`
    csv += `Method:,"${method === 'PROGRESSIVE' ? 'Progressive Tier' : 'Graduated Tier'}"\n`
    if (locationId) {
      csv += `Location Filter:,"${locationId}"\n`
    }
    
    // Return CSV file
    const filename = `commission-report-${format(month, 'yyyy-MM')}.csv`
    
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
    
  } catch (error: any) {
    console.error('Commission export error - Full error:', error)
    console.error('Commission export error - Details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    return NextResponse.json(
      { error: error.message || 'Failed to export commissions' },
      { status: 500 }
    )
  }
}