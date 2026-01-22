'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

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
  const [showRestoreModal, setShowRestoreModal] = useState(false)
  const [showPackagesModal, setShowPackagesModal] = useState(false)
  const [restoreError, setRestoreError] = useState('')

  const handleArchive = async () => {
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
        alert(`Client archived successfully. ${
          data.warnings.hadActivePackages
            ? `Note: ${data.warnings.packagesDeactivated} active package(s) were also archived.`
            : ''
        }`)
        router.refresh()
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      alert('Failed to archive client')
    } finally {
      setLoading(false)
      setShowConfirm(false)
    }
  }

  const handleRestore = () => {
    setRestoreError('')
    setShowRestoreModal(true)
  }

  const confirmRestore = () => {
    // Close first modal and open packages question modal
    setShowRestoreModal(false)
    setShowPackagesModal(true)
  }

  const executeRestore = async (restorePackages: boolean) => {
    setShowPackagesModal(false)
    setLoading(true)
    try {
      const response = await fetch(`/api/clients/${clientId}/deactivate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reactivatePackages: restorePackages }),
      })

      const data = await response.json()

      if (response.ok) {
        router.refresh()
      } else {
        setRestoreError(data.error || 'Failed to restore client')
        setShowRestoreModal(true)
      }
    } catch (error) {
      setRestoreError('Failed to restore client')
      setShowRestoreModal(true)
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
                Are you sure you want to archive {clientName}?
              </span>
              <Button
                variant="danger"
                size="sm"
                onClick={handleArchive}
                disabled={loading}
              >
                {loading ? 'Archiving...' : 'Yes, Archive'}
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
              onClick={handleArchive}
              disabled={loading}
            >
              Archive Client
            </Button>
          )}
        </>
      ) : (
        <Button
          variant="success"
          size="sm"
          onClick={handleRestore}
          disabled={loading}
        >
          {loading ? 'Restoring...' : 'Restore Client'}
        </Button>
      )}

      {/* Restore Client Confirmation Modal */}
      <ConfirmModal
        isOpen={showRestoreModal}
        onClose={() => {
          setShowRestoreModal(false)
          setRestoreError('')
        }}
        onConfirm={confirmRestore}
        title="Restore Client"
        message={
          restoreError
            ? restoreError
            : `Are you sure you want to restore ${clientName}?`
        }
        confirmLabel="Restore"
        cancelLabel="Cancel"
        variant="info"
        loading={loading}
      />

      {/* Restore Packages Question Modal */}
      <ConfirmModal
        isOpen={showPackagesModal}
        onClose={() => executeRestore(false)}
        onConfirm={() => executeRestore(true)}
        title="Restore Packages"
        message={`Do you also want to restore any unexpired packages for ${clientName}?`}
        confirmLabel="Yes, Restore Packages"
        cancelLabel="No, Just Client"
        variant="info"
        loading={loading}
      />
    </div>
  )
}