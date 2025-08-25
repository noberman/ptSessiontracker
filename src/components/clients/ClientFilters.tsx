'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

export function ClientFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const showInactive = searchParams.get('active') === 'false'
  
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