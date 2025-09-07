'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

interface PackageTemplate {
  id: string
  name: string
  displayName: string
  category: string
  sessions: number
  price: number
  sessionValue: number
}

interface PackageFormProps {
  packageData?: {
    id: string
    packageType: string
    name: string
    totalValue: number
    totalSessions: number
    remainingSessions: number
    startDate?: string | Date | null
    expiresAt?: string | Date | null
    active: boolean
    clientId: string
  }
  clients?: Array<{
    id: string
    name: string
    email: string
  }>
  preselectedClientId?: string
  currentUserRole: string
}

export function PackageForm({ 
  packageData, 
  clients = [],
  preselectedClientId,
  currentUserRole 
}: PackageFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [templates, setTemplates] = useState<PackageTemplate[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(true)
  
  const isEdit = !!packageData
  
  const [formData, setFormData] = useState({
    clientId: packageData?.clientId || preselectedClientId || '',
    packageType: packageData?.packageType || 'Custom',
    name: packageData?.name || '',
    totalValue: packageData?.totalValue || 0,
    totalSessions: packageData?.totalSessions || 0,
    remainingSessions: packageData?.remainingSessions || 0,
    startDate: packageData?.startDate 
      ? new Date(packageData.startDate).toISOString().split('T')[0] 
      : new Date().toISOString().split('T')[0],
    expiresAt: packageData?.expiresAt 
      ? new Date(packageData.expiresAt).toISOString().split('T')[0] 
      : '',
    active: packageData?.active !== false,
  })

  const [sessionValue, setSessionValue] = useState(0)

  // Fetch package templates
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await fetch('/api/package-templates')
        if (response.ok) {
          const data = await response.json()
          setTemplates(data)
        }
      } catch (error) {
        console.error('Failed to fetch templates:', error)
      } finally {
        setLoadingTemplates(false)
      }
    }
    fetchTemplates()
  }, [])

  // Calculate session value when total value or sessions change
  useEffect(() => {
    if (formData.totalValue > 0 && formData.totalSessions > 0) {
      setSessionValue(formData.totalValue / formData.totalSessions)
    } else {
      setSessionValue(0)
    }
  }, [formData.totalValue, formData.totalSessions])

  // Handle package template selection
  const handleTemplateSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const templateId = e.target.value
    
    if (templateId === 'custom') {
      setFormData({
        ...formData,
        packageType: 'Custom',
        name: '',
        totalValue: 0,
        totalSessions: 0,
        remainingSessions: isEdit ? formData.remainingSessions : 0,
      })
      return
    }
    
    const template = templates.find(t => t.id === templateId)
    if (template) {
      setFormData({
        ...formData,
        packageType: template.category,
        name: template.displayName,
        totalValue: template.price,
        totalSessions: template.sessions,
        remainingSessions: isEdit ? formData.remainingSessions : template.sessions,
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Validate required fields
    if (!formData.clientId) {
      setError('Please select a client')
      setLoading(false)
      return
    }

    if (!formData.name) {
      setError('Please enter a package name')
      setLoading(false)
      return
    }

    if (formData.totalValue <= 0 || formData.totalSessions <= 0) {
      setError('Total value and sessions must be greater than 0')
      setLoading(false)
      return
    }

    // Validate dates
    if (formData.expiresAt && formData.startDate) {
      if (new Date(formData.expiresAt) <= new Date(formData.startDate)) {
        setError('Expiration date must be after start date')
        setLoading(false)
        return
      }
    }

    try {
      const url = isEdit ? `/api/packages/${packageData.id}` : '/api/packages'
      const method = isEdit ? 'PUT' : 'POST'
      
      const body: any = {
        clientId: formData.clientId,
        packageType: formData.packageType,
        name: formData.name,
        totalValue: formData.totalValue,
        totalSessions: formData.totalSessions,
        startDate: formData.startDate,
        expiresAt: formData.expiresAt || null,
      }

      if (isEdit) {
        body.active = formData.active
        if (currentUserRole === 'ADMIN') {
          body.remainingSessions = formData.remainingSessions
        }
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save package')
      }

      // Redirect based on context
      if (preselectedClientId) {
        router.push(`/clients/${preselectedClientId}`)
      } else {
        router.push('/packages')
      }
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to save package')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? 'Edit Package' : 'Create New Package'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-error-50 border border-error-200 p-4">
              <p className="text-sm text-error-700">{error}</p>
            </div>
          )}

          {!isEdit && !preselectedClientId && (
            <div>
              <label htmlFor="client" className="block text-sm font-medium text-text-primary mb-1">
                Client *
              </label>
              <select
                id="client"
                required
                value={formData.clientId}
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                className="block w-full rounded-lg border border-border px-3 py-2 text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              >
                <option value="">Select a client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name} ({client.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          {!isEdit && (
            <div>
              <label htmlFor="template" className="block text-sm font-medium text-text-primary mb-1">
                Package Template
              </label>
              <select
                id="template"
                onChange={handleTemplateSelect}
                className="block w-full rounded-lg border border-border px-3 py-2 text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                disabled={loadingTemplates}
              >
                <option value="">Select a template</option>
                <option value="custom">Custom Package</option>
                {templates.length > 0 && (
                  <optgroup label="Prime Packages">
                    {templates.filter(t => t.category === 'Prime').map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.displayName} ({template.sessions} sessions - ${template.price})
                      </option>
                    ))}
                  </optgroup>
                )}
                {templates.length > 0 && (
                  <optgroup label="Elite Packages">
                    {templates.filter(t => t.category === 'Elite').map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.displayName} ({template.sessions} sessions - ${template.price})
                      </option>
                    ))}
                  </optgroup>
                )}
                {templates.length > 0 && (
                  <optgroup label="Transformation Packages">
                    {templates.filter(t => t.category === 'Transformation').map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.displayName} ({template.sessions} credits - ${template.price})
                      </option>
                    ))}
                  </optgroup>
                )}
                {templates.length > 0 && (
                  <optgroup label="Intro Packages">
                    {templates.filter(t => t.category === 'Intro').map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.displayName} ({template.sessions} sessions - ${template.price})
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-text-primary mb-1">
              Package Name *
            </label>
            <Input
              id="name"
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter package name"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="totalValue" className="block text-sm font-medium text-text-primary mb-1">
                Total Value ($) *
              </label>
              <Input
                id="totalValue"
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.totalValue}
                onChange={(e) => setFormData({ ...formData, totalValue: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>

            <div>
              <label htmlFor="totalSessions" className="block text-sm font-medium text-text-primary mb-1">
                Total Sessions *
              </label>
              <Input
                id="totalSessions"
                type="number"
                required
                min="1"
                value={formData.totalSessions}
                onChange={(e) => setFormData({ ...formData, totalSessions: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
          </div>

          <div className="bg-background-secondary rounded-lg p-3">
            <p className="text-sm text-text-secondary">
              Session Value: <span className="font-semibold text-text-primary">
                ${sessionValue.toFixed(2)} per session
              </span>
            </p>
          </div>

          {isEdit && currentUserRole === 'ADMIN' && (
            <div>
              <label htmlFor="remainingSessions" className="block text-sm font-medium text-text-primary mb-1">
                Remaining Sessions
              </label>
              <Input
                id="remainingSessions"
                type="number"
                min="0"
                value={formData.remainingSessions}
                onChange={(e) => setFormData({ ...formData, remainingSessions: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-text-secondary mt-1">
                Admin only: Manually adjust remaining sessions
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-text-primary mb-1">
                Start Date
              </label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
            </div>

            <div>
              <label htmlFor="expiresAt" className="block text-sm font-medium text-text-primary mb-1">
                Expiration Date
              </label>
              <Input
                id="expiresAt"
                type="date"
                value={formData.expiresAt}
                onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
              />
            </div>
          </div>

          {isEdit && (
            <div className="flex items-center">
              <input
                id="active"
                type="checkbox"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="active" className="ml-2 block text-sm text-text-primary">
                Active
              </label>
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Saving...' : (isEdit ? 'Update Package' : 'Create Package')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (preselectedClientId) {
                  router.push(`/clients/${preselectedClientId}`)
                } else {
                  router.push('/packages')
                }
              }}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}