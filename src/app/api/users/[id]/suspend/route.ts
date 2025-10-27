import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/users/[id]/suspend - Suspend a trainer
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Only admins and managers can suspend trainers
  if (!['ADMIN', 'PT_MANAGER', 'CLUB_MANAGER'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  
  try {
    const body = await request.json()
    const { reason = 'LIMIT_EXCEEDED' } = body
    
    // Get the trainer
    const trainer = await prisma.user.findUnique({
      where: { id },
      select: { 
        organizationId: true,
        role: true,
        suspendedAt: true
      }
    })
    
    if (!trainer) {
      return NextResponse.json({ error: 'Trainer not found' }, { status: 404 })
    }
    
    // Only suspend trainers (not admins/managers)
    if (trainer.role !== 'TRAINER') {
      return NextResponse.json({ error: 'Can only suspend trainers' }, { status: 400 })
    }
    
    // Check if already suspended
    if (trainer.suspendedAt) {
      return NextResponse.json({ error: 'Trainer already suspended' }, { status: 400 })
    }
    
    // Verify organization access
    if (session.user.role !== 'ADMIN' && trainer.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: 'Cannot suspend trainers from other organizations' }, { status: 403 })
    }
    
    // Suspend the trainer
    const updatedTrainer = await prisma.user.update({
      where: { id },
      data: {
        suspendedAt: new Date(),
        suspendedReason: reason
      },
      select: {
        id: true,
        name: true,
        email: true,
        suspendedAt: true,
        suspendedReason: true
      }
    })
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'TRAINER_SUSPENDED',
        userId: session.user.id,
        entityType: 'User',
        entityId: id,
        oldValue: { suspendedAt: null },
        newValue: { suspendedAt: updatedTrainer.suspendedAt, reason }
      }
    })
    
    return NextResponse.json({
      message: 'Trainer suspended successfully',
      trainer: updatedTrainer
    })
  } catch (error) {
    console.error('Error suspending trainer:', error)
    return NextResponse.json(
      { error: 'Failed to suspend trainer' },
      { status: 500 }
    )
  }
}

// DELETE /api/users/[id]/suspend - Unsuspend a trainer
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Only admins and managers can unsuspend trainers
  if (!['ADMIN', 'PT_MANAGER', 'CLUB_MANAGER'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  
  try {
    // Get the trainer
    const trainer = await prisma.user.findUnique({
      where: { id },
      select: { 
        organizationId: true,
        suspendedAt: true,
        suspendedReason: true
      }
    })
    
    if (!trainer) {
      return NextResponse.json({ error: 'Trainer not found' }, { status: 404 })
    }
    
    // Check if not suspended
    if (!trainer.suspendedAt) {
      return NextResponse.json({ error: 'Trainer not suspended' }, { status: 400 })
    }
    
    // Verify organization access
    if (session.user.role !== 'ADMIN' && trainer.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: 'Cannot unsuspend trainers from other organizations' }, { status: 403 })
    }
    
    // Unsuspend the trainer
    const updatedTrainer = await prisma.user.update({
      where: { id },
      data: {
        suspendedAt: null,
        suspendedReason: null
      },
      select: {
        id: true,
        name: true,
        email: true,
        suspendedAt: true,
        suspendedReason: true
      }
    })
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'TRAINER_UNSUSPENDED',
        userId: session.user.id,
        entityType: 'User',
        entityId: id,
        oldValue: { suspendedAt: trainer.suspendedAt, reason: trainer.suspendedReason },
        newValue: { suspendedAt: null }
      }
    })
    
    return NextResponse.json({
      message: 'Trainer unsuspended successfully',
      trainer: updatedTrainer
    })
  } catch (error) {
    console.error('Error unsuspending trainer:', error)
    return NextResponse.json(
      { error: 'Failed to unsuspend trainer' },
      { status: 500 }
    )
  }
}