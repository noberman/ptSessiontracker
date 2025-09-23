import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

// Helper endpoint to find the correct price ID for a product
export async function GET(request: NextRequest) {
  try {
    // Get the product ID from the environment or hardcode it
    const productId = 'prod_T6ZdesWielxZ50'
    
    // List all prices for this product
    const prices = await stripe.prices.list({
      product: productId,
      active: true,
    })
    
    // Find the monthly recurring price
    const monthlyPrice = prices.data.find(
      price => price.recurring?.interval === 'month'
    )
    
    if (!monthlyPrice) {
      return NextResponse.json({
        error: 'No monthly price found for product',
        productId,
        allPrices: prices.data.map(p => ({
          id: p.id,
          amount: p.unit_amount ? p.unit_amount / 100 : null,
          currency: p.currency,
          recurring: p.recurring,
        })),
      })
    }
    
    return NextResponse.json({
      success: true,
      message: 'Found the price ID! Add this to your .env.local file:',
      priceId: monthlyPrice.id,
      envVar: `STRIPE_PRO_PRICE_ID=${monthlyPrice.id}`,
      price: {
        id: monthlyPrice.id,
        amount: monthlyPrice.unit_amount ? monthlyPrice.unit_amount / 100 : null,
        currency: monthlyPrice.currency,
        interval: monthlyPrice.recurring?.interval,
      },
    })
  } catch (error: any) {
    console.error('Error fetching price:', error)
    return NextResponse.json(
      { 
        error: error.message,
        hint: 'Make sure your Stripe API key is configured correctly',
      },
      { status: 500 }
    )
  }
}