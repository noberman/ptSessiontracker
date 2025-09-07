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
    location: string
    trainerEmail?: string
    remainingSessions: number
    packageSize: number
    packageTotalValue: number
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
  calculatedSessionValue: number
  packageName: string
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
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [validationResults, setValidationResults] = useState<ValidationResult[] | null>(null)
  const [summary, setSummary] = useState<ImportSummary | null>(null)
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([])
  const [trainers, setTrainers] = useState<Array<{ id: string; name: string; email: string; locationId?: string }>>([])
  const [trainerAssignments, setTrainerAssignments] = useState<Record<string, string>>({})
  const [showResults, setShowResults] = useState(false)
  const [importResults, setImportResults] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'valid' | 'invalid' | 'warnings'>('valid')
  const [isDragging, setIsDragging] = useState(false)

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

    if (summary?.invalidRows && summary.invalidRows > 0) {
      const proceed = confirm(
        `There are ${summary.invalidRows} invalid rows that will be skipped. Continue with import?`
      )
      if (!proceed) return
    }

    setLoading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('action', 'import')
    formData.append('trainerAssignments', JSON.stringify(trainerAssignments))

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

  const getFilteredResults = () => {
    if (!validationResults) return []
    
    if (activeTab === 'valid') {
      return validationResults.filter(r => r.valid)
    } else if (activeTab === 'invalid') {
      return validationResults.filter(r => !r.valid)
    } else {
      return validationResults.filter(r => r.warnings.length > 0)
    }
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
      {validationResults && summary && (
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
                  <p className="text-2xl font-bold text-success-600">{summary.validRows}</p>
                </div>
                <div>
                  <p className="text-sm text-text-secondary">Invalid</p>
                  <p className="text-2xl font-bold text-error-600">{summary.invalidRows}</p>
                </div>
                <div>
                  <p className="text-sm text-text-secondary">Warnings</p>
                  <p className="text-2xl font-bold text-warning-600">{summary.warningRows}</p>
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
                  <p className="text-xl font-semibold text-warning-600">{summary.needsTrainer}</p>
                </div>
                <div>
                  <p className="text-sm text-text-secondary">Total Value</p>
                  <p className="text-xl font-semibold text-text-primary">
                    ${summary.totalPackageValue.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Results */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Import Details</CardTitle>
                <div className="flex space-x-2">
                  <Button
                    variant={activeTab === 'valid' ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setActiveTab('valid')}
                  >
                    Valid ({summary.validRows})
                  </Button>
                  <Button
                    variant={activeTab === 'invalid' ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setActiveTab('invalid')}
                  >
                    Invalid ({summary.invalidRows})
                  </Button>
                  <Button
                    variant={activeTab === 'warnings' ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setActiveTab('warnings')}
                  >
                    Warnings ({summary.warningRows})
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-surface-secondary border-b border-border">
                    <tr>
                      <th className="text-left p-2 text-xs font-medium text-text-secondary">Row</th>
                      <th className="text-left p-2 text-xs font-medium text-text-secondary">Name</th>
                      <th className="text-left p-2 text-xs font-medium text-text-secondary">Email</th>
                      <th className="text-left p-2 text-xs font-medium text-text-secondary">Location</th>
                      <th className="text-left p-2 text-xs font-medium text-text-secondary">Package</th>
                      <th className="text-left p-2 text-xs font-medium text-text-secondary">Trainer</th>
                      <th className="text-left p-2 text-xs font-medium text-text-secondary">Status</th>
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
                        <td className="p-2 text-sm">{result.row.location}</td>
                        <td className="p-2 text-sm">
                          {result.row.remainingSessions}/{result.row.packageSize}
                          <span className="text-text-secondary ml-1">
                            (${result.calculatedSessionValue.toFixed(2)}/session)
                          </span>
                        </td>
                        <td className="p-2">
                          {result.valid && !result.trainer ? (
                            <select
                              className="text-sm border rounded px-2 py-1"
                              value={trainerAssignments[result.row.email] || ''}
                              onChange={(e) => assignTrainer(result.row.email, e.target.value)}
                            >
                              <option value="">Select Trainer</option>
                              {trainers
                                .filter(t => !result.location?.id || t.locationId === result.location.id)
                                .map(trainer => (
                                  <option key={trainer.id} value={trainer.id}>
                                    {trainer.name}
                                  </option>
                                ))}
                            </select>
                          ) : (
                            <span className="text-sm">
                              {result.trainer?.name || '-'}
                            </span>
                          )}
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
                              {result.warnings.map((warning, i) => (
                                <p key={i} className="text-xs text-warning-600">{warning}</p>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Import Actions */}
              {summary.validRows > 0 && (
                <div className="mt-6 flex space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFile(null)
                      setValidationResults(null)
                      setSummary(null)
                      setTrainerAssignments({})
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
                        Import {summary.validRows} Valid Rows
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}