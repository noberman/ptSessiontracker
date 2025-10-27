import { prisma } from '@/lib/prisma'
import { SUBSCRIPTION_TIERS } from '@/lib/stripe'
import { SubscriptionTier } from '@prisma/client'
import { getOrganizationUsage } from '@/lib/usage-limits'

/**
 * Handle subscription downgrade
 * Notifies admin when over limits but does NOT auto-suspend
 * Admin must manually choose who to deactivate
 */
export async function handleSubscriptionDowngrade(
  organizationId: string,
  fromTier: SubscriptionTier,
  toTier: SubscriptionTier
) {
  console.log(`[Downgrade] Organization ${organizationId}: ${fromTier} → ${toTier}`)
  
  // Get the new limits
  const newLimits = SUBSCRIPTION_TIERS[toTier].limits
  
  // Get current usage
  const usage = await getOrganizationUsage(organizationId)
  
  // Check what's over limit
  const overLimits = {
    trainers: usage.trainers.current > newLimits.trainers && newLimits.trainers !== -1,
    locations: usage.locations.current > newLimits.locations && newLimits.locations !== -1,
    sessionsApproaching: usage.sessions.current > (newLimits.sessionsPerMonth * 0.8) && newLimits.sessionsPerMonth !== -1
  }
  
  // If nothing is over limit, no action needed
  if (!overLimits.trainers && !overLimits.locations && !overLimits.sessionsApproaching) {
    console.log('[Downgrade] No limits exceeded, no action needed')
    return
  }
  
  // Create notification messages
  const messages: string[] = []
  
  if (overLimits.trainers) {
    const excess = usage.trainers.current - newLimits.trainers
    messages.push(
      `⚠️ You have ${usage.trainers.current} trainers but your ${toTier} plan allows ${newLimits.trainers}. ` +
      `Please deactivate ${excess} trainer${excess > 1 ? 's' : ''} to comply with your plan limits.`
    )
  }
  
  if (overLimits.locations) {
    const excess = usage.locations.current - newLimits.locations
    messages.push(
      `⚠️ You have ${usage.locations.current} locations but your ${toTier} plan allows ${newLimits.locations}. ` +
      `Please deactivate ${excess} location${excess > 1 ? 's' : ''} to comply with your plan limits.`
    )
  }
  
  if (overLimits.sessionsApproaching) {
    messages.push(
      `⚠️ You've used ${usage.sessions.current} of ${newLimits.sessionsPerMonth} sessions this month (${usage.sessions.percentage}%). ` +
      `Consider upgrading if you need more sessions.`
    )
  }
  
  // Store notification in database (using AdminNotes for now)
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { adminNotes: true }
  })
  
  const timestamp = new Date().toISOString()
  const notification = `[${timestamp}] Downgrade from ${fromTier} to ${toTier}:\n${messages.join('\n')}`
  
  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      adminNotes: org?.adminNotes 
        ? `${org.adminNotes}\n\n${notification}`
        : notification,
      lastIssue: messages[0], // Store the most important issue
      lastIssueDate: new Date()
    }
  })
  
  // Create audit log
  await prisma.auditLog.create({
    data: {
      action: 'SUBSCRIPTION_DOWNGRADE',
      userId: null, // System action
      entityType: 'Organization',
      entityId: organizationId,
      oldValue: { tier: fromTier },
      newValue: { 
        tier: toTier,
        overLimits,
        messages
      }
    }
  })
  
  // TODO: Send email notification to organization admin
  // This would be implemented when email service is ready
  console.log('[Downgrade] Notifications created:', messages)
  
  return {
    overLimits,
    messages
  }
}

/**
 * Check and handle beta expiration
 * Run this daily via cron job or scheduled task
 */
export async function checkAndHandleBetaExpiry() {
  const now = new Date()
  
  // Find organizations with expired beta access
  const expiredBetas = await prisma.organization.findMany({
    where: {
      betaAccess: true,
      betaExpiresAt: {
        lte: now
      }
    },
    select: {
      id: true,
      name: true,
      subscriptionTier: true,
      betaPreviousTier: true,
      betaExpiresAt: true
    }
  })
  
  console.log(`[Beta] Found ${expiredBetas.length} expired beta access organizations`)
  
  for (const org of expiredBetas) {
    try {
      // Determine what tier to revert to
      const revertToTier = org.betaPreviousTier || 'FREE'
      
      console.log(`[Beta] Expiring beta for ${org.name} (${org.id}): SCALE → ${revertToTier}`)
      
      // Update organization
      await prisma.organization.update({
        where: { id: org.id },
        data: {
          betaAccess: false,
          subscriptionTier: revertToTier,
          betaPreviousTier: null,
          betaExpiresAt: null
        }
      })
      
      // Handle the downgrade
      await handleSubscriptionDowngrade(org.id, 'SCALE', revertToTier)
      
      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'BETA_EXPIRED',
          userId: null, // System action
          entityType: 'Organization',
          entityId: org.id,
          oldValue: { 
            betaAccess: true,
            tier: 'SCALE',
            expiresAt: org.betaExpiresAt
          },
          newValue: { 
            betaAccess: false,
            tier: revertToTier
          }
        }
      })
      
    } catch (error) {
      console.error(`[Beta] Error handling beta expiry for org ${org.id}:`, error)
    }
  }
  
  return expiredBetas.length
}

/**
 * Grant beta access to an organization
 */
export async function grantBetaAccess(
  organizationId: string,
  durationDays: number = 30
) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      subscriptionTier: true,
      betaAccess: true
    }
  })
  
  if (!org) {
    throw new Error('Organization not found')
  }
  
  if (org.betaAccess) {
    throw new Error('Organization already has beta access')
  }
  
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + durationDays)
  
  // Grant beta access
  const updated = await prisma.organization.update({
    where: { id: organizationId },
    data: {
      betaAccess: true,
      betaExpiresAt: expiresAt,
      betaPreviousTier: org.subscriptionTier
    }
  })
  
  // Create audit log
  await prisma.auditLog.create({
    data: {
      action: 'BETA_GRANTED',
      userId: null, // Will be set by API route
      entityType: 'Organization',
      entityId: organizationId,
      oldValue: { 
        betaAccess: false,
        tier: org.subscriptionTier
      },
      newValue: { 
        betaAccess: true,
        tier: 'SCALE',
        expiresAt,
        durationDays
      }
    }
  })
  
  console.log(`[Beta] Granted ${durationDays}-day beta access to organization ${organizationId}`)
  
  return updated
}

/**
 * Revoke beta access early
 */
export async function revokeBetaAccess(organizationId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      betaAccess: true,
      betaPreviousTier: true
    }
  })
  
  if (!org) {
    throw new Error('Organization not found')
  }
  
  if (!org.betaAccess) {
    throw new Error('Organization does not have beta access')
  }
  
  const revertToTier = org.betaPreviousTier || 'FREE'
  
  // Revoke beta access
  const updated = await prisma.organization.update({
    where: { id: organizationId },
    data: {
      betaAccess: false,
      betaExpiresAt: null,
      betaPreviousTier: null,
      subscriptionTier: revertToTier
    }
  })
  
  // Handle the downgrade
  await handleSubscriptionDowngrade(organizationId, 'SCALE', revertToTier)
  
  // Create audit log
  await prisma.auditLog.create({
    data: {
      action: 'BETA_REVOKED',
      userId: null, // Will be set by API route
      entityType: 'Organization',
      entityId: organizationId,
      oldValue: { 
        betaAccess: true,
        tier: 'SCALE'
      },
      newValue: { 
        betaAccess: false,
        tier: revertToTier
      }
    }
  })
  
  console.log(`[Beta] Revoked beta access for organization ${organizationId}`)
  
  return updated
}