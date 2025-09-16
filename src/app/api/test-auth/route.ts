import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json()
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    })
    
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        message: 'User not found',
        email 
      })
    }
    
    // Check password
    const isValid = await bcrypt.compare(password, user.password)
    
    return NextResponse.json({
      success: isValid,
      message: isValid ? 'Password correct' : 'Password incorrect',
      user: {
        email: user.email,
        name: user.name,
        role: user.role,
        active: user.active
      },
      debug: {
        passwordProvided: password,
        hashStarts: user.password.substring(0, 7),
        hashLength: user.password.length
      }
    })
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      message: 'Error testing auth',
      error: String(error)
    })
  }
}