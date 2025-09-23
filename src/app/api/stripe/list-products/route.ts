import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

// Temporary endpoint to list products and prices
// Remove before production!
export async function GET(request: NextRequest) {
  try {
    // Fetch all products
    const products = await stripe.products.list({ limit: 10, active: true })
    
    // Fetch all prices
    const prices = await stripe.prices.list({ limit: 10, active: true })
    
    return NextResponse.json({
      success: true,
      productsCount: products.data.length,
      pricesCount: prices.data.length,
      products: products.data.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        active: p.active,
      })),
      prices: prices.data.map(p => ({
        id: p.id,
        product: p.product,
        unitAmount: p.unit_amount ? p.unit_amount / 100 : null, // Convert cents to dollars
        currency: p.currency,
        recurring: p.recurring ? {
          interval: p.recurring.interval,
          intervalCount: p.recurring.interval_count,
        } : null,
        type: p.type,
      })),
      message: products.data.length === 0 
        ? 'No products found. Please create a product in your Stripe Dashboard.'
        : 'Products and prices fetched successfully',
    })
  } catch (error: any) {
    console.error('Error fetching Stripe products:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message 
      },
      { status: 500 }
    )
  }
}