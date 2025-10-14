'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'

interface Blocker {
  type: string
  count: number
  message: string
}

interface ArchiveImpact {
  canArchive: boolean
  blockers: Blocker[]
  warnings?: Array<{
    type: string
    count: number
    message: string
    severity: string
  }>
  summary: {
    activeUsers?: number
    activeClients?: number
    upcomingSessions?: number
    activePackages?: number
    historicalSessions?: number
  }
  location?: {
    id: string
    name: string
  }
}

interface ArchiveLocationDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (reason: string) => Promise<void>
  locationId: string
  locationName: string
}

export function ArchiveLocationDialog({
  isOpen,
  onClose,
  onConfirm,
  locationId,
  locationName
}: ArchiveLocationDialogProps) {
  const [loading, setLoading] = useState(false)
  const [checkingImpact, setCheckingImpact] = useState(false)
  const [impact, setImpact] = useState<ArchiveImpact | null>(null)
  const [reason, setReason] = useState('')
  const [confirmChecked, setConfirmChecked] = useState(false)

  useEffect(() => {
    if (isOpen && locationId) {
      checkArchiveImpact()
    }
  }, [isOpen, locationId])

  const checkArchiveImpact = async () => {
    setCheckingImpact(true)
    setImpact(null)
    
    try {
      const response = await fetch(`/api/locations/${locationId}/archive-impact`)
      const data = await response.json()
      setImpact(data)
    } catch (error) {
      console.error('Failed to check archive impact:', error)
      setImpact({
        canArchive: false,
        blockers: [{
          type: 'error',
          count: 0,
          message: 'Failed to check archive impact. Please try again.'
        }],
        summary: {}
      })
    } finally {
      setCheckingImpact(false)
    }
  }

  const handleConfirm = async () => {
    if (!impact?.canArchive || !confirmChecked) return
    
    setLoading(true)
    try {
      await onConfirm(reason)
      setReason('')
      setConfirmChecked(false)
      onClose()
    } catch (error) {
      console.error('Failed to archive location:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setReason('')
    setConfirmChecked(false)
    setImpact(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {checkingImpact ? 'Checking Archive Impact...' :
             impact?.canArchive ? '⚠️ Archive Location?' :
             '❌ Cannot Archive This Location'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {checkingImpact ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-sm text-text-secondary">
                Checking dependencies...
              </p>
            </div>
          ) : impact ? (
            <>
              {/* Location info */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900">Location: {locationName}</p>
              </div>

              {impact.canArchive ? (
                <>
                  {/* Can archive - show confirmation */}
                  <div className="space-y-3">
                    <p className="text-sm text-gray-700">
                      This location will be:
                    </p>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>Hidden from all dropdowns and forms</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>Inaccessible for new sessions or clients</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>Preserving {impact.summary.historicalSessions || 0} historical records</span>
                      </li>
                    </ul>

                    {/* Warnings */}
                    {impact.warnings && impact.warnings.length > 0 && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        {impact.warnings.map((warning, idx) => (
                          <p key={idx} className="text-sm text-blue-700">
                            ℹ️ {warning.message}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Reason input */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Reason for archiving (optional)
                      </label>
                      <Input
                        type="text"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="e.g., Location closed, Moved to new building"
                        className="w-full"
                      />
                    </div>

                    {/* Confirmation checkbox */}
                    <div className="flex items-start space-x-2">
                      <input
                        type="checkbox"
                        id="confirm-archive"
                        checked={confirmChecked}
                        onChange={(e) => setConfirmChecked(e.target.checked)}
                        className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <label htmlFor="confirm-archive" className="text-sm text-gray-700">
                        I understand this location will be archived and hidden from use
                      </label>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Cannot archive - show blockers */}
                  <div className="space-y-3">
                    <p className="text-sm text-gray-700">
                      This location has active dependencies that must be resolved first:
                    </p>
                    
                    <div className="space-y-2">
                      {impact.blockers.map((blocker, idx) => (
                        <div key={idx} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-sm font-medium text-red-800">
                            • {blocker.message}
                          </p>
                        </div>
                      ))}
                    </div>

                    <p className="text-sm text-gray-600">
                      Please resolve these dependencies before archiving this location.
                    </p>
                  </div>
                </>
              )}
            </>
          ) : null}

          {/* Action buttons */}
          <div className="flex space-x-3 pt-2">
            {impact?.canArchive ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={loading}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  onClick={handleConfirm}
                  disabled={!confirmChecked || loading}
                  className="flex-1"
                >
                  {loading ? 'Archiving...' : 'Archive Location'}
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="w-full"
              >
                Understood
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}