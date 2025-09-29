'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, AlertCircle, CheckCircle, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export default function ImportClonePage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [jsonData, setJsonData] = useState<any>(null)

  // Check if we're in development
  const isDevelopment = process.env.NODE_ENV === 'development'

  if (!isDevelopment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
          <div className="flex items-center gap-2 text-red-600 mb-4">
            <AlertCircle className="h-6 w-6" />
            <h1 className="text-xl font-bold">Not Available</h1>
          </div>
          <p className="text-gray-600">
            Clone import is only available in development environment for safety.
          </p>
        </div>
      </div>
    )
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setError('')
    setSuccess('')

    // Read and validate JSON
    try {
      const text = await selectedFile.text()
      const data = JSON.parse(text)
      
      // Validate structure
      if (!data.metadata || !data.organization || !data.users) {
        throw new Error('Invalid export file structure')
      }
      
      setJsonData(data)
    } catch (err: any) {
      setError('Invalid JSON file: ' + err.message)
      setFile(null)
      setJsonData(null)
    }
  }

  const handleImport = async () => {
    if (!jsonData) return

    setImporting(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/super-admin/import-clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jsonData)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Import failed')
      }

      setSuccess(`Successfully imported clone: ${result.clonedOrg.name}`)
      
      // Reset after 3 seconds and redirect
      setTimeout(() => {
        router.push('/super-admin')
      }, 3000)
    } catch (err: any) {
      setError('Import failed: ' + err.message)
    } finally {
      setImporting(false)
    }
  }

  const handleDeleteAllClones = async () => {
    if (!confirm('Are you sure you want to delete ALL clone organizations? This cannot be undone.')) {
      return
    }

    try {
      const response = await fetch('/api/super-admin/delete-clones', {
        method: 'DELETE'
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Delete failed')
      }

      setSuccess(`Deleted ${result.count} clone organizations`)
    } catch (err: any) {
      setError('Delete failed: ' + err.message)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-8">
        {/* Header */}
        <div className="bg-purple-600 text-white p-6 rounded-lg mb-6">
          <h1 className="text-2xl font-bold mb-2">Clone Import (Local Only)</h1>
          <p className="text-purple-100">
            Import exported organization data as a clone for debugging
          </p>
        </div>

        {/* Warning */}
        <div className="bg-yellow-50 border border-yellow-400 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="text-sm text-yellow-800 font-semibold">Development Mode Only</p>
              <p className="text-sm text-yellow-700 mt-1">
                This feature is only available in local development. 
                Clones will have "CLONE_" prefix and test passwords.
              </p>
            </div>
          </div>
        </div>

        {/* Import Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Import Organization Clone</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Export File (JSON)
              </label>
              <input
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-purple-50 file:text-purple-700
                  hover:file:bg-purple-100"
              />
            </div>

            {jsonData && (
              <div className="bg-gray-50 rounded p-4">
                <h3 className="font-medium mb-2">Export Details:</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>Organization: {jsonData.organization.name}</p>
                  <p>Exported: {new Date(jsonData.metadata.exportedAt).toLocaleString()}</p>
                  <p>Users: {jsonData.metadata.recordCounts.users}</p>
                  <p>Clients: {jsonData.metadata.recordCounts.clients}</p>
                  <p>Sessions: {jsonData.metadata.recordCounts.sessions}</p>
                  <p>Packages: {jsonData.metadata.recordCounts.packages}</p>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                {success}
              </div>
            )}

            <div className="flex gap-4">
              <Button
                onClick={handleImport}
                disabled={!jsonData || importing}
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                {importing ? 'Importing...' : 'Import as Clone'}
              </Button>

              <Button
                variant="outline"
                onClick={() => router.push('/super-admin')}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>

        {/* Clone Management */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Clone Management</h2>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-gray-700 mb-3">
              Delete all clone organizations and their data. This is useful for cleanup after debugging.
            </p>
            <Button
              variant="destructive"
              onClick={handleDeleteAllClones}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete All Clones
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}