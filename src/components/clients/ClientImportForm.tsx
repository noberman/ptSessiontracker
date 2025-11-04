'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { 
  Upload, 
  Download, 
  AlertCircle, 
  CheckCircle, 
  XCircle,
  FileText,
  Users,
  Package,
  DollarSign,
  AlertTriangle,
  Loader2
} from 'lucide-react'

interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  row: {
    rowNumber: number
    name: string
    email: string
    phone?: string
    location: string
    trainerEmail?: string
    packageName: string
    totalSessions?: number
    remainingSessions: number
    totalValue?: number
    sessionValue?: number
    expiryDate?: Date
  }
  existingClient?: {
    id: string
    name: string
    email: string
  }
  location?: {
    id: string
    name: string
  }
  trainer?: {
    id: string
    name: string
    email: string
  }
  packageType?: {
    id: string
    name: string
    defaultSessions?: number | null
    defaultPrice?: number | null
  }
}

interface ImportSummary {
  totalRows: number
  validRows: number
  invalidRows: number
  warningRows: number
  existingClients: number
  newClients: number
  needsTrainer: number
  totalPackageValue: number
}

interface ClientImportFormProps {
  userRole: string
}

export function ClientImportForm({ userRole }: ClientImportFormProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const validationResultsRef = useRef<HTMLDivElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [validationResults, setValidationResults] = useState<ValidationResult[] | null>(null)
  const [summary, setSummary] = useState<ImportSummary | null>(null)
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([])
  const [trainers, setTrainers] = useState<Array<{ id: string; name: string; email: string; locationId?: string; locationIds?: string[] }>>([])
  const [packageTypes, setPackageTypes] = useState<Array<{ id: string; name: string; defaultSessions?: number | null; defaultPrice?: number | null }>>([])
  const [trainerAssignments, setTrainerAssignments] = useState<Record<string, string>>({})
  const [locationAssignments, setLocationAssignments] = useState<Record<string, string>>({})
  const [packageTypeAssignments, setPackageTypeAssignments] = useState<Record<string, string>>({})
  const [showResults, setShowResults] = useState(false)
  const [importResults, setImportResults] = useState<any>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [duplicateHandling, setDuplicateHandling] = useState<'skip' | 'overwrite'>('skip')
  const [showValidationBanner, setShowValidationBanner] = useState(false)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      processFile(selectedFile)
    }
  }

  const processFile = (selectedFile: File) => {
    if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
      alert('Please select a CSV file')
      return
    }
    setFile(selectedFile)
    setValidationResults(null)
    setSummary(null)
    setImportResults(null)
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      processFile(files[0])
    }
  }

  const downloadTemplate = async () => {
    try {
      const response = await fetch('/api/clients/import')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'client_import_template.csv'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      alert('Failed to download template')
    }
  }

  const validateFile = async () => {
    if (!file) {
      alert('Please select a file first')
      return
    }

    setLoading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('action', 'validate')
    formData.append('trainerAssignments', JSON.stringify(trainerAssignments))

    try {
      const response = await fetch('/api/clients/import', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Validation failed')
      }

      setValidationResults(data.results)
      setSummary(data.summary)
      setLocations(data.locations || [])
      setTrainers(data.trainers || [])
      setPackageTypes(data.packageTypes || [])
      
      // Show validation banner and auto-hide after 5 seconds
      setShowValidationBanner(true)
      setTimeout(() => setShowValidationBanner(false), 5000)
      
      // Auto-scroll to validation results after a brief delay for render
      setTimeout(() => {
        if (validationResultsRef.current) {
          validationResultsRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
          })
        }
      }, 100)
    } catch (error: any) {
      alert(error.message || 'Failed to validate file')
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    if (!file || !validationResults) {
      alert('Please validate the file first')
      return
    }

    // Don't show warning if UI shows all rows as valid
    // The server will validate with the manual assignments

    setLoading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('action', 'import')
    formData.append('trainerAssignments', JSON.stringify(trainerAssignments))
    formData.append('locationAssignments', JSON.stringify(locationAssignments))
    formData.append('packageTypeAssignments', JSON.stringify(packageTypeAssignments))
    formData.append('duplicateHandling', duplicateHandling)

    try {
      const response = await fetch('/api/clients/import', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Import failed')
      }

      setImportResults(data)
      setShowResults(true)
    } catch (error: any) {
      alert(error.message || 'Failed to import file')
    } finally {
      setLoading(false)
    }
  }

  const assignTrainer = (clientEmail: string, trainerId: string) => {
    setTrainerAssignments(prev => ({
      ...prev,
      [clientEmail]: trainerId
    }))
  }

  const assignLocation = (clientEmail: string, locationId: string) => {
    setLocationAssignments(prev => ({
      ...prev,
      [clientEmail]: locationId
    }))
    // Clear trainer assignment when location changes since trainers are location-specific
    setTrainerAssignments(prev => {
      const updated = { ...prev }
      delete updated[clientEmail]
      return updated
    })
  }


  const getFilteredResults = () => {
    if (!validationResults) return []
    // Apply live validation updates based on manual assignments
    return validationResults.map(result => recalculateValidation(result))
  }

  // Recalculate validation status based on manual assignments
  const recalculateValidation = (result: ValidationResult): ValidationResult => {
    const updatedResult = { ...result }
    const errors = [...result.errors]
    const warnings = [...result.warnings]
    
    // Check if location has been manually assigned
    const assignedLocationId = locationAssignments[result.row.email]
    if (assignedLocationId) {
      const location = locations.find(l => l.id === assignedLocationId)
      if (location) {
        // Remove location-related errors
        const locationErrorIndex = errors.findIndex(e => 
          e.includes('Location') || e.includes('not found') || e.includes('not available')
        )
        if (locationErrorIndex > -1) {
          errors.splice(locationErrorIndex, 1)
        }
        updatedResult.location = location
      }
    }
    
    // Check if package type has been manually assigned
    const assignedPackageTypeId = packageTypeAssignments[result.row.email]
    if (assignedPackageTypeId) {
      const packageType = packageTypes.find(t => t.id === assignedPackageTypeId)
      if (packageType) {
        updatedResult.packageType = packageType
      }
    }
    
    // Check if trainer has been manually assigned
    const assignedTrainerId = trainerAssignments[result.row.email]
    if (assignedTrainerId) {
      const trainer = trainers.find(t => t.id === assignedTrainerId)
      if (trainer) {
        // Remove ALL trainer-related errors (there might be multiple)
        let i = errors.length
        while (i--) {
          if (errors[i].includes('Trainer') || errors[i].includes('trainer')) {
            errors.splice(i, 1)
          }
        }
        updatedResult.trainer = trainer
      }
    }
    
    // Update valid status based on whether there are still errors
    updatedResult.errors = errors
    updatedResult.warnings = warnings
    updatedResult.valid = errors.length === 0
    
    return updatedResult
  }

  if (showResults && importResults) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckCircle className="h-6 w-6 text-success-600" />
            <span>Import Complete</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-success-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-success-900 font-medium">Successful</p>
                    <p className="text-2xl font-bold text-success-700">
                      {importResults.summary.successful}
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-success-600" />
                </div>
              </div>

              <div className="p-4 bg-primary-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-primary-900 font-medium">Clients</p>
                    <p className="text-lg font-semibold text-primary-700">
                      {importResults.summary.clientsCreated} new
                    </p>
                    <p className="text-sm text-primary-600">
                      {importResults.summary.clientsUpdated} updated
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-primary-600" />
                </div>
              </div>

              <div className="p-4 bg-primary-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-primary-900 font-medium">Packages</p>
                    <p className="text-2xl font-bold text-primary-700">
                      {importResults.summary.packagesCreated}
                    </p>
                  </div>
                  <Package className="h-8 w-8 text-primary-600" />
                </div>
              </div>
            </div>

            {/* Failed Imports */}
            {importResults.results.failed.length > 0 && (
              <div className="p-4 bg-error-50 rounded-lg">
                <h3 className="font-medium text-error-900 mb-2">Failed Imports</h3>
                <ul className="space-y-1">
                  {importResults.results.failed.map((fail: any, idx: number) => (
                    <li key={idx} className="text-sm text-error-700">
                      Row {fail.row}: {fail.email} - {fail.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Actions */}
            <div className="flex space-x-3">
              <Button
                onClick={() => router.push('/clients')}
                className="flex-1"
              >
                View Clients
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setFile(null)
                  setValidationResults(null)
                  setSummary(null)
                  setImportResults(null)
                  setShowResults(false)
                  setTrainerAssignments({})
                  if (fileInputRef.current) {
                    fileInputRef.current.value = ''
                  }
                }}
                className="flex-1"
              >
                Import Another File
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Validation Complete Banner */}
      {showValidationBanner && validationResults && (
        <div className="mb-4 p-4 bg-success-50 border border-success-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-success-600 mr-3" />
            <span className="text-success-800 font-medium">
              Validation complete! {summary?.validRows || 0} valid rows, {summary?.invalidRows || 0} issues found.
            </span>
          </div>
          <span className="text-success-700 text-sm animate-bounce">
            ↓ Scroll down to view results
          </span>
        </div>
      )}
      
      {/* File Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload CSV File</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div 
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging 
                  ? 'border-primary-500 bg-primary-50' 
                  : 'border-border hover:border-primary-300'
              }`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <Upload className={`h-12 w-12 mx-auto mb-4 ${
                isDragging ? 'text-primary-600' : 'text-text-secondary'
              }`} />
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              
              <label
                htmlFor="file-upload"
                className="cursor-pointer"
              >
                <span className="text-primary-600 hover:text-primary-700 font-medium">
                  Choose a file
                </span>
                <span className="text-text-secondary"> or drag and drop</span>
              </label>
              
              {file && (
                <div className="mt-4 flex items-center justify-center space-x-2">
                  <FileText className="h-5 w-5 text-text-secondary" />
                  <span className="text-sm text-text-primary">{file.name}</span>
                  <Badge variant="gray" size="sm">
                    {(file.size / 1024).toFixed(2)} KB
                  </Badge>
                </div>
              )}
            </div>

            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={downloadTemplate}
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
              
              <Button
                onClick={validateFile}
                disabled={!file || loading}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Validating...
                  </>
                ) : (
                  'Validate File'
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Validation Results */}
      <div ref={validationResultsRef}>
      {validationResults && summary && (() => {
        // Calculate live summary based on current validation state
        const liveResults = getFilteredResults()
        const liveSummary = {
          ...summary,
          validRows: liveResults.filter(r => r.valid).length,
          invalidRows: liveResults.filter(r => !r.valid).length,
          warningRows: liveResults.filter(r => r.warnings.length > 0).length,
          needsTrainer: liveResults.filter(r => r.valid && !r.trainer).length
        }
        
        return (
        <>
          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle>Validation Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-text-secondary">Total Rows</p>
                  <p className="text-2xl font-bold text-text-primary">{summary.totalRows}</p>
                </div>
                <div>
                  <p className="text-sm text-text-secondary">Valid</p>
                  <p className="text-2xl font-bold text-success-600">{liveSummary.validRows}</p>
                </div>
                <div>
                  <p className="text-sm text-text-secondary">Invalid</p>
                  <p className="text-2xl font-bold text-error-600">{liveSummary.invalidRows}</p>
                </div>
                <div>
                  <p className="text-sm text-text-secondary">Warnings</p>
                  <p className="text-2xl font-bold text-warning-600">{liveSummary.warningRows}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-text-secondary">New Clients</p>
                  <p className="text-xl font-semibold text-text-primary">{summary.newClients}</p>
                </div>
                <div>
                  <p className="text-sm text-text-secondary">Existing</p>
                  <p className="text-xl font-semibold text-text-primary">{summary.existingClients}</p>
                </div>
                <div>
                  <p className="text-sm text-text-secondary">Need Trainer</p>
                  <p className="text-xl font-semibold text-warning-600">{liveSummary.needsTrainer}</p>
                </div>
                <div>
                  <p className="text-sm text-text-secondary">Total Value</p>
                  <p className="text-xl font-semibold text-text-primary">
                    ${summary.totalPackageValue.toLocaleString()}
                  </p>
                </div>
              </div>
              
              {/* Duplicate Handling Options */}
              {summary.existingClients > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-medium text-text-primary mb-3">
                    When a client already has the same package:
                  </p>
                  <div className="flex gap-4">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="duplicateHandling"
                        value="skip"
                        checked={duplicateHandling === 'skip'}
                        onChange={(e) => setDuplicateHandling(e.target.value as 'skip' | 'overwrite')}
                        className="mr-2"
                      />
                      <div>
                        <span className="text-sm font-medium text-text-primary">Skip</span>
                        <p className="text-xs text-text-secondary">Keep existing package, ignore import row</p>
                      </div>
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="duplicateHandling"
                        value="overwrite"
                        checked={duplicateHandling === 'overwrite'}
                        onChange={(e) => setDuplicateHandling(e.target.value as 'skip' | 'overwrite')}
                        className="mr-2"
                      />
                      <div>
                        <span className="text-sm font-medium text-text-primary">Overwrite</span>
                        <p className="text-xs text-text-secondary">Replace existing package with imported data</p>
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Detailed Results */}
          <Card>
            <CardHeader>
              <CardTitle>Import Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-surface-secondary border-b border-border">
                    <tr>
                      <th className="text-left p-2 text-xs font-medium text-text-secondary w-12">Row</th>
                      <th className="text-left p-2 text-xs font-medium text-text-secondary min-w-[120px]">Name</th>
                      <th className="text-left p-2 text-xs font-medium text-text-secondary min-w-[180px]">Email</th>
                      <th className="text-left p-2 text-xs font-medium text-text-secondary min-w-[140px]">Location</th>
                      <th className="text-left p-2 text-xs font-medium text-text-secondary min-w-[180px]">Package</th>
                      <th className="text-left p-2 text-xs font-medium text-text-secondary min-w-[150px]">Trainer</th>
                      <th className="text-left p-2 text-xs font-medium text-text-secondary min-w-[100px]">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {getFilteredResults().map((result, idx) => (
                      <tr key={idx} className="hover:bg-surface-hover">
                        <td className="p-2 text-sm">{result.row.rowNumber}</td>
                        <td className="p-2 text-sm">
                          {result.row.name}
                          {result.existingClient && (
                            <Badge variant="gray" size="xs" className="ml-2">Exists</Badge>
                          )}
                        </td>
                        <td className="p-2 text-sm text-text-secondary">{result.row.email}</td>
                        <td className="p-2 text-sm">
                          <select
                            className={`text-sm border rounded px-2 py-1 w-full ${
                              !result.location ? 'border-error-300' : ''
                            }`}
                            value={locationAssignments[result.row.email] || result.location?.id || ''}
                            onChange={(e) => assignLocation(result.row.email, e.target.value)}
                          >
                            <option value="">Select Location</option>
                            {locations.map(location => (
                              <option key={location.id} value={location.id}>
                                {location.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2 text-sm">
                          <div>
                            <div className="font-medium mb-1">{result.row.packageName}</div>
                            {packageTypes.length > 0 && (
                              <select
                                className={`text-sm border rounded px-2 py-1 w-full mb-1 ${
                                  result.packageType ? 'border-success-300 bg-success-50' : 'border-warning-300'
                                }`}
                                value={packageTypeAssignments[result.row.email] || result.packageType?.id || ''}
                                onChange={(e) => {
                                  setPackageTypeAssignments(prev => ({
                                    ...prev,
                                    [result.row.email]: e.target.value
                                  }))
                                }}
                              >
                                <option value="">Custom Package (No Type)</option>
                                {packageTypes.map(type => (
                                  <option key={type.id} value={type.id}>
                                    {type.name}
                                  </option>
                                ))}
                              </select>
                            )}
                            <div className="text-xs text-text-secondary">
                              {result.row.remainingSessions}/{result.row.totalSessions || result.packageType?.defaultSessions || 'N/A'} sessions
                            </div>
                            {result.packageType?.defaultPrice && (
                              <div className="text-xs text-text-secondary">
                                ${result.packageType.defaultPrice.toFixed(2)} (${(result.packageType.defaultPrice / (result.packageType.defaultSessions || 1)).toFixed(2)}/session)
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-2">
                          <select
                            className={`text-sm border rounded px-2 py-1 w-full ${
                              !result.trainer && !trainerAssignments[result.row.email] 
                                ? 'border-error-300' 
                                : ''
                            }`}
                            value={trainerAssignments[result.row.email] || result.trainer?.id || ''}
                            onChange={(e) => assignTrainer(result.row.email, e.target.value)}
                          >
                            <option value="">No Trainer</option>
                            {(() => {
                              // Get the effective location (manual assignment or original)
                              const effectiveLocationId = locationAssignments[result.row.email] || result.location?.id
                              
                              // Filter trainers by the effective location
                              // Check BOTH old locationId AND new locationIds array
                              const filteredTrainers = effectiveLocationId 
                                ? trainers.filter(t => {
                                    // Check if trainer has access to this location
                                    // Via old system (locationId field)
                                    if (t.locationId === effectiveLocationId) return true
                                    // Via new system (locationIds array from junction table)
                                    if (t.locationIds && t.locationIds.includes(effectiveLocationId)) return true
                                    return false
                                  })
                                : [] // If no location, show no trainers (they need a location)
                              
                              if (filteredTrainers.length === 0 && effectiveLocationId) {
                                return [
                                  <option key="no-trainers" disabled>
                                    No trainers at this location
                                  </option>
                                ]
                              }
                              
                              return filteredTrainers.map(trainer => (
                                <option key={trainer.id} value={trainer.id}>
                                  {trainer.name}
                                </option>
                              ))
                            })()}
                          </select>
                        </td>
                        <td className="p-2">
                          {result.valid ? (
                            <Badge variant="success" size="sm">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Valid
                            </Badge>
                          ) : (
                            <Badge variant="error" size="sm">
                              <XCircle className="h-3 w-3 mr-1" />
                              Invalid
                            </Badge>
                          )}
                          {result.errors.length > 0 && (
                            <div className="mt-1">
                              {result.errors.map((error, i) => (
                                <p key={i} className="text-xs text-error-600">{error}</p>
                              ))}
                            </div>
                          )}
                          {result.warnings.length > 0 && (
                            <div className="mt-1">
                              {result.warnings.map((warning, i) => {
                                // Check if this is a duplicate package warning
                                if (warning.includes('will ADD') || warning.includes('already has')) {
                                  return (
                                    <p key={i} className="text-xs text-warning-600">
                                      {duplicateHandling === 'skip' 
                                        ? '⚠️ Package exists - will skip this row'
                                        : '⚠️ Package exists - will overwrite with imported data'}
                                    </p>
                                  )
                                }
                                return <p key={i} className="text-xs text-warning-600">{warning}</p>
                              })}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Import Actions */}
              {liveSummary.validRows > 0 && (
                <div className="mt-6 flex space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFile(null)
                      setValidationResults(null)
                      setSummary(null)
                      setTrainerAssignments({})
                      setLocationAssignments({})
                      setPackageTypeAssignments({})
                      if (fileInputRef.current) {
                        fileInputRef.current.value = ''
                      }
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleImport}
                    disabled={loading}
                    className="flex-1"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Import {liveSummary.validRows} Valid Rows
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )
      })()}
      </div>
    </div>
  )
}