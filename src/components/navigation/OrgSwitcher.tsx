'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Building, ChevronDown, Check } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function OrgSwitcher() {
  const { data: session, update } = useSession()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isSwitching, setIsSwitching] = useState(false)

  // Debug logging
  console.log('🏢 OrgSwitcher - Session data:', {
    hasSession: !!session,
    hasUser: !!session?.user,
    hasAvailableOrgs: !!session?.user?.availableOrgs,
    availableOrgsLength: session?.user?.availableOrgs?.length || 0,
    availableOrgs: session?.user?.availableOrgs,
    currentOrgId: session?.user?.organizationId,
    currentOrgName: session?.user?.organizationName,
    userEmail: session?.user?.email
  })

  // Don't render if user has no orgs or only one org
  if (!session?.user?.availableOrgs || session.user.availableOrgs.length <= 1) {
    console.log('🏢 OrgSwitcher - Not rendering (single org or no orgs)')
    return null
  }

  const currentOrg = session.user.organizationName || 'Select Organization'
  const availableOrgs = session.user.availableOrgs || []

  const handleSwitchOrg = async (orgId: string, userId: string) => {
    console.log('🔀 OrgSwitcher - Switch attempt:', {
      currentOrgId: session.user.organizationId,
      targetOrgId: orgId,
      targetUserId: userId,
      isSameOrg: orgId === session.user.organizationId
    })
    
    if (orgId === session.user.organizationId) {
      console.log('🔀 Already in this org, skipping switch')
      return // Already in this org
    }
    
    try {
      setIsSwitching(true)
      
      // Store the last selected organization
      console.log('🔀 Storing in localStorage:', orgId)
      localStorage.setItem('lastOrganizationId', orgId)
      
      // Call API to switch organization
      console.log('🔀 Calling switch API with:', { organizationId: orgId, userId })
      const response = await fetch('/api/auth/switch-org', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          organizationId: orgId,
          userId: userId 
        }),
      })

      console.log('🔀 API Response:', {
        ok: response.ok,
        status: response.status
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('🔀 API Error:', errorData)
        throw new Error('Failed to switch organization')
      }

      const result = await response.json()
      console.log('🔀 API Success:', result)

      // Update the session with the new organization
      console.log('🔀 Updating session with new org...')
      // Pass the new organizationId to the session update
      await update({
        organizationId: orgId,
        switchingOrg: true
      })
      console.log('🔀 Session updated, reloading page...')
      
      // Refresh the page to reload with new org context
      window.location.reload()
    } catch (error) {
      console.error('🔀 Failed to switch organization:', error)
      // TODO: Show error toast
    } finally {
      setIsSwitching(false)
      setIsOpen(false)
    }
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="w-full justify-between px-3 py-2 h-auto"
          disabled={isSwitching}
        >
          <div className="flex items-center gap-2 text-left">
            <Building className="h-4 w-4 shrink-0" />
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">
                {currentOrg}
              </div>
              {availableOrgs.length > 1 && (
                <div className="text-xs text-muted-foreground">
                  {availableOrgs.length} organizations
                </div>
              )}
            </div>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="start" className="w-[240px] bg-white dark:bg-gray-900 border shadow-lg z-50">
        <DropdownMenuLabel>Switch Organization</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {availableOrgs.map((org) => (
          <DropdownMenuItem
            key={org.orgId}
            onClick={() => handleSwitchOrg(org.orgId, org.userId)}
            className="cursor-pointer"
          >
            <Check 
              className={cn(
                "mr-2 h-4 w-4",
                org.orgId === session.user.organizationId
                  ? "opacity-100" 
                  : "opacity-0"
              )}
            />
            <div className="flex flex-col">
              <span className="text-sm">{org.orgName}</span>
              <span className="text-xs text-muted-foreground">
                {org.role.replace('_', ' ')}
              </span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}