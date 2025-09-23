import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

// Simple test endpoint - no auth required for initial setup
// IMPORTANT: Remove or secure this endpoint before going to production!
export async function GET(request: NextRequest) {
  try {
    // Try to retrieve account info to verify connection
    const account = await stripe.accounts.retrieve()

    return NextResponse.json({
      success: true,
      message: 'Stripe connection successful!',
      account: {
        id: account.id,
        country: account.country,
      },
      environment: process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') ? 'test/sandbox' : 'live',
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Stripe connection error:', error)
    
    // Provide helpful error messages
    let errorMessage = 'Failed to connect to Stripe'
    let suggestion = ''
    
    if (error.type === 'StripeAuthenticationError') {
      errorMessage = 'Invalid API key'
      suggestion = 'Check that STRIPE_SECRET_KEY is set correctly in .env.local'
    } else if (error.type === 'StripeConnectionError') {
      errorMessage = 'Network error connecting to Stripe'
      suggestion = 'Check your internet connection'
    } else if (error.message?.includes('No such')) {
      errorMessage = 'Resource not found'
      suggestion = 'Make sure you\'re using the correct API keys'
    }
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: error.message,
        type: error.type,
        suggestion,
        checkEnvVar: 'STRIPE_SECRET_KEY',
        envVarExists: !!process.env.STRIPE_SECRET_KEY,
        envVarPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 7) + '...',
      },
      { status: 500 }
    )
  }
}