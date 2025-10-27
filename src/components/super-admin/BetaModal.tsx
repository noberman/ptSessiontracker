'use client'

import { useState } from 'react'
import { X, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface BetaModalProps {
  organizationId: string
  organizationName: string
  currentTier: string
  onClose: () => void
  onSuccess: () => void
}

export default function BetaModal({ 
  organizationId, 
  organizationName, 
  currentTier,
  onClose, 
  onSuccess 
}: BetaModalProps) {
  const [loading, setLoading] = useState(false)
  const [durationDays, setDurationDays] = useState('')
  const [error, setError] = useState('')

  const handleGrantBeta = async () => {
    setError('')
    setLoading(true)
    
    try {
      const response = await fetch('/api/super-admin/grant-beta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          organizationId,
          durationDays: durationDays ? parseInt(durationDays) : null // null = indefinite
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        setError(data.error || 'Failed to grant beta access')
        return
      }
      
      alert(`Beta access granted${durationDays ? ` for ${durationDays} days` : ' indefinitely'}`)
      onSuccess()
    } catch (error) {
      console.error('Grant beta error:', error)
      setError('Failed to grant beta access')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            Grant Beta Access
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-6">
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">Organization:</p>
            <p className="font-semibold">{organizationName}</p>
            <p className="text-xs text-gray-500">Current tier: {currentTier}</p>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Beta Duration
            </label>
            <input
              type="number"
              placeholder="Days (leave empty for indefinite)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              value={durationDays}
              onChange={(e) => setDurationDays(e.target.value)}
              min="1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave empty for indefinite beta access
            </p>
          </div>
          
          <div className="mb-4 p-3 bg-yellow-50 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Beta Access Includes:</strong>
            </p>
            <ul className="text-xs text-yellow-700 mt-1 list-disc list-inside">
              <li>SCALE tier features (unlimited trainers, locations, sessions)</li>
              <li>All premium features enabled</li>
              <li>Priority support</li>
              <li>{durationDays ? `Auto-expires after ${durationDays} days` : 'No expiration date'}</li>
            </ul>
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>
        
        <div className="flex justify-end gap-3 p-6 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleGrantBeta}
            disabled={loading}
            className="bg-yellow-500 hover:bg-yellow-600 text-white"
          >
            {loading ? 'Granting...' : 'Grant Beta Access'}
          </Button>
        </div>
      </div>
    </div>
  )
}