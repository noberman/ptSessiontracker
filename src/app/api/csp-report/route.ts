import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const report = await request.json()
    
    console.error('🚨 CSP VIOLATION DETECTED:')
    console.error('Document URI:', report['csp-report']?.['document-uri'])
    console.error('Violated directive:', report['csp-report']?.['violated-directive'])
    console.error('Blocked URI:', report['csp-report']?.['blocked-uri'])
    console.error('Source file:', report['csp-report']?.['source-file'])
    console.error('Full report:', JSON.stringify(report, null, 2))
    
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing CSP report:', error)
    return NextResponse.json({ error: 'Invalid report' }, { status: 400 })
  }
}