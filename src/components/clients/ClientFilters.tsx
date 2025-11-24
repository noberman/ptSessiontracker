'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

export function ClientFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [hasInitialized, setHasInitialized] = useState(false)
  
  const showInactive = searchParams.get('active') === 'false'
  
  // Load persisted state on mount
  useEffect(() => {
    if (!hasInitialized && typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('client-filters')
      if (stored) {
        try {
          const { showInactive: storedInactive } = JSON.parse(stored)
          // Only apply if URL doesn't have the param already
          if (!searchParams.has('active') && storedInactive) {
            const params = new URLSearchParams(searchParams.toString())
            params.set('active', 'false')
            router.push(`/clients?${params.toString()}`)
          }
        } catch (error) {
          console.warn('Failed to load client filters:', error)
        }
      }
      setHasInitialized(true)
    }
  }, [hasInitialized, searchParams, router])
  
  // Save state whenever it changes
  useEffect(() => {
    if (hasInitialized && typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('client-filters', JSON.stringify({ showInactive }))
      } catch (error) {
        console.warn('Failed to save client filters:', error)
      }
    }
  }, [showInactive, hasInitialized])
  
  const toggleInactive = () => {
    const params = new URLSearchParams(searchParams.toString())
    
    if (showInactive) {
      // Currently showing inactive, switch to active only
      params.delete('active')
    } else {
      // Currently showing active, switch to show all
      params.set('active', 'false')
    }
    
    // Reset to page 1 when changing filters
    params.delete('page')
    
    router.push(`/clients?${params.toString()}`)
  }
  
  return (
    <div className="flex items-center space-x-4">
      <Button
        variant={showInactive ? 'primary' : 'outline'}
        size="sm"
        onClick={toggleInactive}
      >
        {showInactive ? 'Showing All Clients' : 'Show Inactive Clients'}
      </Button>
      
      {showInactive && (
        <Badge variant="warning" size="sm">
          Including inactive clients
        </Badge>
      )}
    </div>
  )
}