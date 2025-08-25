'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

interface ClientActionsProps {
  clientId: string
  clientName: string
  isActive: boolean
  canManage: boolean
}

export function ClientActions({ clientId, clientName, isActive, canManage }: ClientActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleDeactivate = async () => {
    if (!showConfirm) {
      setShowConfirm(true)
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/clients/${clientId}/deactivate`, {
        method: 'POST',
      })

      const data = await response.json()

      if (response.ok) {
        alert(`Client deactivated successfully. ${
          data.warnings.hadActivePackages 
            ? `Note: ${data.warnings.packagesDeactivated} active package(s) were also deactivated.` 
            : ''
        }`)
        router.refresh()
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      alert('Failed to deactivate client')
    } finally {
      setLoading(false)
      setShowConfirm(false)
    }
  }

  const handleReactivate = async () => {
    setLoading(true)
    try {
      const reactivatePackages = confirm('Do you also want to reactivate any unexpired packages?')
      
      const response = await fetch(`/api/clients/${clientId}/deactivate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reactivatePackages }),
      })

      const data = await response.json()

      if (response.ok) {
        alert(`Client reactivated successfully. ${
          data.packagesReactivated > 0 
            ? `${data.packagesReactivated} package(s) were also reactivated.` 
            : ''
        }`)
        router.refresh()
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      alert('Failed to reactivate client')
    } finally {
      setLoading(false)
    }
  }

  if (!canManage) {
    return null
  }

  return (
    <div className="flex items-center space-x-2">
      {isActive ? (
        <>
          {showConfirm ? (
            <>
              <span className="text-sm text-error-600">
                Are you sure you want to deactivate {clientName}?
              </span>
              <Button
                variant="danger"
                size="sm"
                onClick={handleDeactivate}
                disabled={loading}
              >
                {loading ? 'Deactivating...' : 'Yes, Deactivate'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowConfirm(false)}
                disabled={loading}
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button
              variant="danger"
              size="sm"
              onClick={handleDeactivate}
              disabled={loading}
            >
              Deactivate Client
            </Button>
          )}
        </>
      ) : (
        <Button
          variant="success"
          size="sm"
          onClick={handleReactivate}
          disabled={loading}
        >
          {loading ? 'Reactivating...' : 'Reactivate Client'}
        </Button>
      )}
    </div>
  )
}