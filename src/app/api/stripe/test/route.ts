import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      )
    }

    // Test Stripe connection by fetching products
    const products = await stripe.products.list({ limit: 5 })
    
    // Test pricing
    const prices = await stripe.prices.list({ limit: 5 })
    
    // Get account info to verify connection
    const account = await stripe.accounts.retrieve()

    return NextResponse.json({
      success: true,
      message: 'Stripe connection successful',
      data: {
        accountId: account.id,
        accountCountry: account.country,
        productsCount: products.data.length,
        pricesCount: prices.data.length,
        products: products.data.map(p => ({
          id: p.id,
          name: p.name,
          active: p.active,
        })),
        prices: prices.data.map(p => ({
          id: p.id,
          product: p.product,
          unitAmount: p.unit_amount,
          currency: p.currency,
          recurring: p.recurring,
        })),
      },
      environment: process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') ? 'test' : 'live',
    })
  } catch (error: any) {
    console.error('Stripe test connection error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to connect to Stripe',
        type: error.type || 'unknown',
        code: error.code || 'unknown',
      },
      { status: 500 }
    )
  }
}