'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Package, Plus, X } from 'lucide-react'

interface PackageData {
  name: string
  sessions: number
  price: number
}

interface PackageSetupStepProps {
  onNext: (data: { packages: PackageData[] }) => void
  onSkip: () => void
}

export function PackageSetupStep({ onNext, onSkip }: PackageSetupStepProps) {
  const [packages, setPackages] = useState<PackageData[]>([])
  const [currentPackage, setCurrentPackage] = useState<PackageData>({
    name: '',
    sessions: 10,
    price: 500
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const templates = [
    { name: '5 Sessions', sessions: 5, price: 275 },
    { name: '10 Sessions', sessions: 10, price: 500 },
    { name: '20 Sessions', sessions: 20, price: 900 }
  ]

  const handleAddPackage = () => {
    if (!currentPackage.name) {
      setError('Please enter a package name')
      return
    }

    setPackages([...packages, currentPackage])
    setCurrentPackage({ name: '', sessions: 10, price: 500 })
    setError('')
  }

  const handleRemovePackage = (index: number) => {
    setPackages(packages.filter((_, i) => i !== index))
  }

  const handleUseTemplate = (template: typeof templates[0]) => {
    setCurrentPackage(template)
  }

  const handleSavePackages = async () => {
    setIsLoading(true)
    setError('')

    try {
      // Save packages
      const results = await Promise.allSettled(
        packages.map(pkg =>
          fetch('/api/package-types', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: pkg.name,
              defaultSessions: pkg.sessions,
              defaultPrice: pkg.price,
            }),
          })
        )
      )

      const successful = results.filter(r => r.status === 'fulfilled').length
      
      if (successful > 0) {
        onNext({ packages })
      } else {
        setError('Failed to save packages. Please try again.')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleContinue = () => {
    if (packages.length > 0) {
      handleSavePackages()
    } else {
      onSkip()
    }
  }

  return (
    <Card className="p-8 md:p-10">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
          <Package className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-text-primary mb-2">
          What training packages are you selling?
        </h2>
        <p className="text-text-secondary">
          Add the packages your clients typically purchase
        </p>
      </div>

      {/* Quick Templates */}
      <div className="mb-6">
        <p className="text-sm font-medium mb-2">Quick add templates:</p>
        <div className="flex flex-wrap gap-2">
          {templates.map((template) => (
            <Button
              key={template.name}
              variant="outline"
              size="sm"
              onClick={() => handleUseTemplate(template)}
            >
              {template.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Add Package Form */}
      <div className="mb-6 p-4 bg-background-secondary rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Package name</label>
            <Input
              placeholder="e.g., 10 Session Package"
              value={currentPackage.name}
              onChange={(e) => setCurrentPackage({...currentPackage, name: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Sessions</label>
            <Input
              type="number"
              min="0"
              value={currentPackage.sessions}
              onChange={(e) => setCurrentPackage({...currentPackage, sessions: parseInt(e.target.value) || 0})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Price ($)</label>
            <div className="flex gap-2">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={currentPackage.price}
                onChange={(e) => setCurrentPackage({...currentPackage, price: parseFloat(e.target.value) || 0})}
              />
              <Button onClick={handleAddPackage} disabled={!currentPackage.name}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Package List */}
      {packages.length > 0 && (
        <div className="mb-6">
          <p className="text-sm font-medium mb-2">Your packages:</p>
          <div className="space-y-2">
            {packages.map((pkg, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-background-secondary rounded-lg">
                <div className="flex items-center gap-3">
                  <Package className="w-4 h-4 text-text-secondary" />
                  <span className="text-sm font-medium">{pkg.name}</span>
                  <span className="text-xs bg-primary-100 text-primary px-2 py-1 rounded">
                    {pkg.sessions} sessions
                  </span>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                    ${pkg.price}
                  </span>
                </div>
                <button
                  onClick={() => handleRemovePackage(index)}
                  className="text-text-secondary hover:text-error"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-error-50 border border-error-200 rounded-md">
          <p className="text-sm text-error-600">{error}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between">
        <Button
          variant="ghost"
          onClick={onSkip}
          disabled={isLoading}
        >
          Skip for now
        </Button>
        
        <Button
          onClick={handleContinue}
          disabled={isLoading}
          size="lg"
        >
          {isLoading ? 'Saving...' : 'Continue'}
        </Button>
      </div>
    </Card>
  )
}