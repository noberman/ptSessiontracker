'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { CheckCircle, Trash2, X } from 'lucide-react'

interface CompletionModalProps {
  demoData: {
    clientName: string
    packageName: string
    sessionCount: number
  }
  onClearData: () => Promise<void>
  onClose: () => void
}

export function CompletionModal({ demoData, onClearData, onClose }: CompletionModalProps) {
  const [isClearing, setIsClearing] = useState(false)

  const handleClearData = async () => {
    setIsClearing(true)
    await onClearData()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="relative p-6">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Content */}
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-10 h-10 text-success" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Tour Complete! 🎉
            </h2>
            
            <p className="text-gray-600 mb-6">
              You&apos;ve successfully experienced the FitSync workflow
            </p>

            {/* Demo data summary */}
            <div className="bg-warning-50 border border-warning-200 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm font-semibold text-warning-900 mb-2">
                Demo Data Created:
              </p>
              <ul className="text-sm text-warning-800 space-y-1">
                <li>• 1 test client ({demoData.clientName})</li>
                <li>• 1 demo package ({demoData.packageName})</li>
                <li>• {demoData.sessionCount} validated session</li>
              </ul>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleClearData}
                disabled={isClearing}
                className="flex-1"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {isClearing ? 'Clearing...' : 'Clear Demo Data'}
              </Button>
              <Button
                onClick={onClose}
                className="flex-1"
              >
                Keep Data & Continue
              </Button>
            </div>

            <p className="text-xs text-gray-500 mt-4">
              You can clear demo data anytime from your dashboard settings
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}