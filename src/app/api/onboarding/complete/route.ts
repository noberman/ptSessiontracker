import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only admins can complete onboarding
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only admins can complete onboarding' },
        { status: 403 }
      )
    }

    // Get the request body for any final data to save
    const body = await request.json()

    // Update user to mark onboarding as complete
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        onboardingCompletedAt: new Date(),
      },
      include: {
        organization: true,
      }
    })

    // If there are any defaults to set based on skipped steps, handle them here
    if (body.skippedSteps?.includes('commission') && updatedUser.organizationId) {
      // Set default commission if skipped
      const existingTiers = await prisma.commissionTier.findFirst({
        where: { organizationId: updatedUser.organizationId }
      })

      if (!existingTiers) {
        await prisma.commissionTier.create({
          data: {
            organizationId: updatedUser.organizationId,
            minSessions: 0,
            maxSessions: null,
            percentage: 0.5, // 50% default
          }
        })
      }
    }

    if (body.skippedSteps?.includes('packages') && updatedUser.organizationId) {
      // Create default package types if skipped
      const existingPackageTypes = await prisma.packageType.findFirst({
        where: { organizationId: updatedUser.organizationId }
      })

      if (!existingPackageTypes) {
        await prisma.packageType.createMany({
          data: [
            {
              organizationId: updatedUser.organizationId,
              name: '10 Session Package',
              defaultSessions: 10,
              defaultPrice: 500,
              sortOrder: 1,
            },
            {
              organizationId: updatedUser.organizationId,
              name: '5 Session Package',
              defaultSessions: 5,
              defaultPrice: 275,
              sortOrder: 2,
            }
          ]
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Onboarding completed successfully',
      user: {
        id: updatedUser.id,
        onboardingCompletedAt: updatedUser.onboardingCompletedAt,
      }
    })
  } catch (error) {
    console.error('Error completing onboarding:', error)
    return NextResponse.json(
      { error: 'Failed to complete onboarding' },
      { status: 500 }
    )
  }
}