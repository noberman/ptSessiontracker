'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress'
import { Package, Plus, X, DollarSign } from 'lucide-react'

interface PackageType {
  name: string
  sessions: number
  price: number
}

export default function PackagesPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [packages, setPackages] = useState<PackageType[]>([])
  const [currentPackage, setCurrentPackage] = useState<PackageType>({
    name: '',
    sessions: 10,
    price: 500
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showSkip, setShowSkip] = useState(false)

  // Show skip button after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowSkip(true), 3000)
    return () => clearTimeout(timer)
  }, [])

  // Quick add templates
  const templates = [
    { name: '5 Sessions', sessions: 5, price: 275 },
    { name: '10 Sessions', sessions: 10, price: 500 },
    { name: '20 Sessions', sessions: 20, price: 900 },
    { name: 'Monthly Unlimited', sessions: 999, price: 199 },
  ]

  const handleAddPackage = () => {
    if (!currentPackage.name || currentPackage.sessions <= 0 || currentPackage.price <= 0) {
      setError('Please fill in all fields with valid values')
      return
    }

    // Check for duplicates
    if (packages.some(pkg => pkg.name === currentPackage.name)) {
      setError('A package with this name already exists')
      return
    }

    setPackages([...packages, currentPackage])
    setCurrentPackage({ name: '', sessions: 10, price: 500 })
    setError('')
  }

  const handleQuickAdd = (template: PackageType) => {
    if (packages.some(pkg => pkg.name === template.name)) {
      setError('This package already exists')
      return
    }
    setPackages([...packages, template])
    setError('')
  }

  const handleRemovePackage = (index: number) => {
    setPackages(packages.filter((_, i) => i !== index))
  }

  const handleContinue = async () => {
    setIsLoading(true)
    setError('')

    try {
      // Save packages to organization
      if (packages.length > 0) {
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
        if (successful === 0) {
          throw new Error('Failed to save packages')
        }
      }

      // Save progress
      const progress = JSON.parse(localStorage.getItem('onboarding_progress') || '{}')
      localStorage.setItem('onboarding_progress', JSON.stringify({
        ...progress,
        currentStep: 4,
        completedSteps: [...(progress.completedSteps || []), 'packages'],
        data: { 
          ...progress.data,
          packages: packages 
        }
      }))

      router.push('/onboarding/commissions')
    } catch (err) {
      setError('Failed to save packages. Please try again.')
      setIsLoading(false)
    }
  }

  const handleSkip = () => {
    const progress = JSON.parse(localStorage.getItem('onboarding_progress') || '{}')
    localStorage.setItem('onboarding_progress', JSON.stringify({
      ...progress,
      currentStep: 4,
      completedSteps: [...(progress.completedSteps || []), 'packages'],
      skippedSteps: [...(progress.skippedSteps || []), 'packages']
    }))
    router.push('/onboarding/commissions')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <OnboardingProgress currentStep={3} />
        
        <Card className="p-8 md:p-10 max-w-2xl mx-auto">
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

          {/* Quick Add Templates */}
          <div className="mb-6">
            <p className="text-sm text-text-secondary mb-2">Quick add:</p>
            <div className="flex flex-wrap gap-2">
              {templates.map((template) => (
                <Button
                  key={template.name}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAdd(template)}
                  disabled={packages.some(pkg => pkg.name === template.name)}
                >
                  {template.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Add Package Form */}
          <div className="mb-6 p-4 bg-background-secondary rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <div className="md:col-span-2">
                <label className="block text-xs text-text-secondary mb-1">Package name</label>
                <Input
                  type="text"
                  placeholder="e.g., 10 Session Package"
                  value={currentPackage.name}
                  onChange={(e) => setCurrentPackage({ ...currentPackage, name: e.target.value })}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddPackage()}
                />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">Sessions</label>
                <Input
                  type="number"
                  min="1"
                  placeholder="10"
                  value={currentPackage.sessions}
                  onChange={(e) => setCurrentPackage({ ...currentPackage, sessions: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">Price ($)</label>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    placeholder="500"
                    value={currentPackage.price}
                    onChange={(e) => setCurrentPackage({ ...currentPackage, price: parseFloat(e.target.value) || 0 })}
                    className="pl-8"
                  />
                  <DollarSign className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-text-secondary" />
                </div>
              </div>
            </div>
            <Button
              type="button"
              onClick={handleAddPackage}
              disabled={!currentPackage.name}
              className="mt-3"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Package
            </Button>
          </div>

          {/* Packages List */}
          {packages.length > 0 && (
            <div className="mb-6">
              <div className="space-y-2">
                {packages.map((pkg, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-background-secondary rounded-lg">
                    <div className="flex items-center gap-4">
                      <Package className="w-4 h-4 text-text-secondary" />
                      <div>
                        <span className="font-medium text-sm">{pkg.name}</span>
                        <span className="text-xs text-text-secondary ml-2">
                          {pkg.sessions === 999 ? 'Unlimited' : `${pkg.sessions} sessions`} • ${pkg.price}
                        </span>
                      </div>
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
              <p className="text-sm text-text-secondary mt-2">
                {packages.length} package{packages.length !== 1 ? 's' : ''} configured
              </p>
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
              onClick={handleSkip}
              disabled={isLoading}
              className={`transition-opacity ${showSkip ? 'opacity-100' : 'opacity-0'}`}
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
      </div>
    </div>
  )
}