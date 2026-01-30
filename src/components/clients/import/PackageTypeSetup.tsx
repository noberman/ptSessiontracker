'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import {
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Info,
  Package,
} from 'lucide-react'
import type { MatchedPackage, UnmatchedPackage } from '@/lib/csv-column-mapping'

interface PackageTypeSetupProps {
  matchedPackages: MatchedPackage[]
  unmatchedPackages: UnmatchedPackage[]
  existingPackageTypes: Array<{
    id: string
    name: string
    defaultSessions?: number | null
    defaultPrice?: number | null
  }>
  onComplete: (resolutions: Record<string, { packageTypeId: string; packageTypeName: string }>) => void
  onBack: () => void
}

interface CreateForm {
  name: string
  sessions: string
  price: string
}

export function PackageTypeSetup({
  matchedPackages,
  unmatchedPackages,
  existingPackageTypes,
  onComplete,
  onBack,
}: PackageTypeSetupProps) {
  // Track which unmatched packages have been resolved
  const [resolutions, setResolutions] = useState<
    Record<string, { type: 'created' | 'mapped'; packageTypeId: string; packageTypeName: string }>
  >({})

  // Track which mode each unmatched package is in
  const [modes, setModes] = useState<Record<string, 'create' | 'map'>>(() => {
    const initial: Record<string, 'create' | 'map'> = {}
    for (const pkg of unmatchedPackages) {
      initial[pkg.csvName] = 'create'
    }
    return initial
  })

  // Create forms state
  const [createForms, setCreateForms] = useState<Record<string, CreateForm>>(() => {
    const initial: Record<string, CreateForm> = {}
    for (const pkg of unmatchedPackages) {
      initial[pkg.csvName] = {
        name: pkg.csvName,
        sessions: pkg.suggestedSessions?.toString() || '',
        price: '',
      }
    }
    return initial
  })

  // Map selections
  const [mapSelections, setMapSelections] = useState<Record<string, string>>({})

  // Loading state for package creation
  const [creating, setCreating] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)

  // Track newly created package types (so they appear in the map dropdown)
  const [newlyCreatedTypes, setNewlyCreatedTypes] = useState<
    Array<{ id: string; name: string }>
  >([])

  const allTypes = [...existingPackageTypes, ...newlyCreatedTypes]

  const allResolved = unmatchedPackages.every(pkg => resolutions[pkg.csvName])

  const handleCreatePackageType = async (csvName: string) => {
    const form = createForms[csvName]
    if (!form.name || !form.sessions || !form.price) return

    setCreating(csvName)
    setCreateError(null)

    try {
      const response = await fetch('/api/package-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          defaultSessions: parseInt(form.sessions),
          defaultPrice: parseFloat(form.price),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create package type')
      }

      const created = await response.json()

      setNewlyCreatedTypes(prev => [...prev, { id: created.id, name: created.name }])
      setResolutions(prev => ({
        ...prev,
        [csvName]: {
          type: 'created',
          packageTypeId: created.id,
          packageTypeName: created.name,
        },
      }))
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create package type')
    } finally {
      setCreating(null)
    }
  }

  const handleMapToExisting = (csvName: string, packageTypeId: string) => {
    setMapSelections(prev => ({ ...prev, [csvName]: packageTypeId }))
    const type = allTypes.find(t => t.id === packageTypeId)
    if (type) {
      setResolutions(prev => ({
        ...prev,
        [csvName]: {
          type: 'mapped',
          packageTypeId: type.id,
          packageTypeName: type.name,
        },
      }))
    }
  }

  const handleUndoResolution = (csvName: string) => {
    setResolutions(prev => {
      const updated = { ...prev }
      delete updated[csvName]
      return updated
    })
  }

  const handleComplete = () => {
    const result: Record<string, { packageTypeId: string; packageTypeName: string }> = {}
    for (const [csvName, resolution] of Object.entries(resolutions)) {
      result[csvName] = {
        packageTypeId: resolution.packageTypeId,
        packageTypeName: resolution.packageTypeName,
      }
    }
    onComplete(result)
  }

  const updateCreateForm = (csvName: string, field: keyof CreateForm, value: string) => {
    setCreateForms(prev => ({
      ...prev,
      [csvName]: { ...prev[csvName], [field]: value },
    }))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Package Type Setup
        </CardTitle>
        <p className="text-sm text-text-secondary mt-1">
          We found package names in your file that need to be matched to your system&apos;s package types.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Matched packages */}
        {matchedPackages.length > 0 && (
          <div className="space-y-2">
            {matchedPackages.map(pkg => (
              <div
                key={pkg.csvName}
                className="flex items-center gap-3 p-3 rounded-lg border border-success-200 bg-success-50"
              >
                <CheckCircle className="h-4 w-4 text-success-600 flex-shrink-0" />
                <div className="flex-1">
                  <span className="text-sm font-medium text-text-primary">
                    &ldquo;{pkg.csvName}&rdquo;
                  </span>
                  {pkg.matchType === 'fuzzy' && (
                    <span className="text-xs text-success-700 ml-2">
                      matched to &ldquo;{pkg.packageType.name}&rdquo;
                    </span>
                  )}
                </div>
                <Badge variant="gray" size="sm">
                  {pkg.clientCount} {pkg.clientCount === 1 ? 'row' : 'rows'}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {/* Unmatched packages */}
        {unmatchedPackages.length > 0 && (
          <div className="space-y-4">
            {unmatchedPackages.map(pkg => {
              const isResolved = !!resolutions[pkg.csvName]
              const mode = modes[pkg.csvName]
              const form = createForms[pkg.csvName]

              return (
                <div
                  key={pkg.csvName}
                  className={`p-4 rounded-lg border ${
                    isResolved
                      ? 'border-success-200 bg-success-50'
                      : 'border-warning-200 bg-warning-50'
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-3">
                    {isResolved ? (
                      <CheckCircle className="h-4 w-4 text-success-600 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-warning-600 flex-shrink-0" />
                    )}
                    <span className="text-sm font-medium text-text-primary flex-1">
                      &ldquo;{pkg.csvName}&rdquo;
                    </span>
                    <Badge variant={isResolved ? 'success' : 'warning'} size="sm">
                      {pkg.clientCount} {pkg.clientCount === 1 ? 'row' : 'rows'}
                    </Badge>
                  </div>

                  {isResolved ? (
                    <div className="flex items-center justify-between ml-7">
                      <span className="text-sm text-success-700">
                        {resolutions[pkg.csvName].type === 'created'
                          ? `Created as "${resolutions[pkg.csvName].packageTypeName}"`
                          : `Mapped to "${resolutions[pkg.csvName].packageTypeName}"`}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUndoResolution(pkg.csvName)}
                      >
                        Undo
                      </Button>
                    </div>
                  ) : (
                    <div className="ml-7 space-y-3">
                      {/* Mode toggle */}
                      <div className="flex gap-4 text-sm">
                        <button
                          className={`pb-1 border-b-2 font-medium ${
                            mode === 'create'
                              ? 'border-primary text-primary'
                              : 'border-transparent text-text-secondary hover:text-text-primary'
                          }`}
                          onClick={() =>
                            setModes(prev => ({ ...prev, [pkg.csvName]: 'create' }))
                          }
                        >
                          Create New
                        </button>
                        <button
                          className={`pb-1 border-b-2 font-medium ${
                            mode === 'map'
                              ? 'border-primary text-primary'
                              : 'border-transparent text-text-secondary hover:text-text-primary'
                          }`}
                          onClick={() =>
                            setModes(prev => ({ ...prev, [pkg.csvName]: 'map' }))
                          }
                        >
                          Map to Existing
                        </button>
                      </div>

                      {mode === 'create' ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="text-xs font-medium text-text-secondary">
                                Name
                              </label>
                              <Input
                                value={form.name}
                                onChange={e =>
                                  updateCreateForm(pkg.csvName, 'name', e.target.value)
                                }
                                placeholder="Package name"
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-text-secondary">
                                Total Sessions
                              </label>
                              <Input
                                type="number"
                                min={1}
                                value={form.sessions}
                                onChange={e =>
                                  updateCreateForm(pkg.csvName, 'sessions', e.target.value)
                                }
                                placeholder="e.g., 12"
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-text-secondary">
                                Price
                              </label>
                              <Input
                                type="number"
                                min={0}
                                step="0.01"
                                value={form.price}
                                onChange={e =>
                                  updateCreateForm(pkg.csvName, 'price', e.target.value)
                                }
                                placeholder="e.g., 600"
                                className="mt-1"
                              />
                            </div>
                          </div>
                          {createError && creating === null && (
                            <p className="text-xs text-error-600">{createError}</p>
                          )}
                          <Button
                            size="sm"
                            onClick={() => handleCreatePackageType(pkg.csvName)}
                            disabled={
                              creating !== null ||
                              !form.name ||
                              !form.sessions ||
                              !form.price
                            }
                          >
                            {creating === pkg.csvName ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                Creating...
                              </>
                            ) : (
                              'Create'
                            )}
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <select
                            className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-white focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            value={mapSelections[pkg.csvName] || ''}
                            onChange={e =>
                              handleMapToExisting(pkg.csvName, e.target.value)
                            }
                          >
                            <option value="">Select existing package type...</option>
                            {allTypes.map(type => (
                              <option key={type.id} value={type.id}>
                                {type.name}
                              </option>
                            ))}
                          </select>
                          {pkg.suggestedMatch && (
                            <p className="text-xs text-primary-600">
                              Did you mean &ldquo;{pkg.suggestedMatch.name}&rdquo;?
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Info banner */}
        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-700">
            Package types define the default sessions and pricing. Individual packages can
            still have different values.
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button onClick={handleComplete} disabled={!allResolved}>
            Continue
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
