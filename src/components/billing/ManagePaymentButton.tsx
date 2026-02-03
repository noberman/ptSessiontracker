'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Loader2 } from 'lucide-react'

export function ManagePaymentButton() {
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to open billing portal')
      }
      
      // If the response is a redirect, get the URL from the response
      if (response.redirected) {
        window.location.href = response.url
      } else {
        // If not redirected, parse the JSON response for the URL
        const data = await response.json()
        if (data.url) {
          window.location.href = data.url
        }
      }
    } catch (error: unknown) {
      console.error('Error opening billing portal:', error)
      alert(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button 
      variant="outline" 
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Loading...
        </>
      ) : (
        'Manage Payment Methods'
      )}
    </Button>
  )
}