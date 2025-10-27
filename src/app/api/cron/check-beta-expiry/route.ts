import { NextRequest, NextResponse } from 'next/server'
import { checkAndHandleBetaExpiry } from '@/lib/handle-downgrade'

// GET /api/cron/check-beta-expiry - Check and handle expired beta access
// This should be called daily by a cron job
export async function GET(request: NextRequest) {
  // Verify the request is from a cron job (check for secret in headers)
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  
  // In production, you should verify this is from your cron service
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  try {
    console.log('[Cron] Starting beta expiry check...')
    const expiredCount = await checkAndHandleBetaExpiry()
    
    console.log(`[Cron] Beta expiry check completed. ${expiredCount} organizations processed.`)
    
    return NextResponse.json({
      success: true,
      message: `Processed ${expiredCount} expired beta organizations`,
      expiredCount,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('[Cron] Error checking beta expiry:', error)
    
    // Return success to prevent cron retry on error
    // Log the error for monitoring
    return NextResponse.json({
      success: false,
      error: 'Failed to process beta expiry',
      timestamp: new Date().toISOString()
    })
  }
}

// POST endpoint for manual triggering (admin only)
export async function POST(request: NextRequest) {
  // This endpoint can be used to manually trigger the beta check
  // Only for admin use in emergency situations
  
  try {
    // Parse authorization token from request
    const authHeader = request.headers.get('authorization')
    
    // You might want to verify admin session here
    // For now, we'll just check for a secret
    const adminSecret = process.env.ADMIN_API_SECRET
    if (adminSecret && authHeader !== `Bearer ${adminSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    console.log('[Manual] Admin triggered beta expiry check...')
    const expiredCount = await checkAndHandleBetaExpiry()
    
    return NextResponse.json({
      success: true,
      message: `Manually processed ${expiredCount} expired beta organizations`,
      expiredCount,
      timestamp: new Date().toISOString(),
      triggeredBy: 'admin'
    })
  } catch (error) {
    console.error('[Manual] Error in admin beta check:', error)
    return NextResponse.json(
      { error: 'Failed to process beta expiry' },
      { status: 500 }
    )
  }
}