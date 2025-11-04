import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { CommissionCalculatorV2 } from '@/lib/commission/v2/CommissionCalculatorV2'
import { z } from 'zod'

const calculateSchema = z.object({
  userId: z.string().optional(), // If not provided, calculate for current user
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  saveCalculation: z.boolean().optional().default(false)
})

// POST /api/commission/calculate - Calculate commission for a period
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await req.json()
    const validatedData = calculateSchema.parse(body)
    
    // Determine user ID
    const userId = validatedData.userId || session.user.id
    
    // Only admins/managers can calculate for other users
    if (validatedData.userId && validatedData.userId !== session.user.id) {
      if (!['PT_MANAGER', 'ADMIN'].includes(session.user.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }
    
    const calculator = new CommissionCalculatorV2()
    
    const calculation = await calculator.calculateCommission(
      userId,
      {
        start: new Date(validatedData.periodStart),
        end: new Date(validatedData.periodEnd)
      },
      {
        saveCalculation: validatedData.saveCalculation
      }
    )
    
    return NextResponse.json(calculation)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      )
    }
    
    console.error('Error calculating commission:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to calculate commission' },
      { status: 500 }
    )
  }
}

// GET /api/commission/calculate - Get calculation history
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId') || session.user.id
    const limit = parseInt(searchParams.get('limit') || '12')
    
    // Only admins/managers can view other users' calculations
    if (userId !== session.user.id) {
      if (!['PT_MANAGER', 'ADMIN'].includes(session.user.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }
    
    const calculator = new CommissionCalculatorV2()
    const history = await calculator.getCalculationHistory(userId, limit)
    
    return NextResponse.json(history)
  } catch (error) {
    console.error('Error fetching calculation history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch calculation history' },
      { status: 500 }
    )
  }
}