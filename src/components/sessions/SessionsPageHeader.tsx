'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Download } from 'lucide-react'

interface SessionsPageHeaderProps {
  canCreate: boolean
}

export function SessionsPageHeader({ canCreate }: SessionsPageHeaderProps) {
  const [isExporting, setIsExporting] = useState(false)
  const searchParams = useSearchParams()

  const handleExport = async () => {
    setIsExporting(true)
    try {
      // Build export URL with current filters from URL
      const params = new URLSearchParams(searchParams.toString())
      // Remove pagination params as we want all results
      params.delete('page')
      params.delete('limit')

      const response = await fetch(`/api/sessions/export?${params.toString()}`)
      if (!response.ok) throw new Error('Export failed')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const today = new Date().toISOString().split('T')[0]
      a.download = `sessions-export-${today}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to export sessions')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Sessions</h1>
        <p className="text-sm text-text-secondary mt-1">
          Manage training sessions
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={isExporting}
        >
          <Download className="h-4 w-4 mr-2" />
          {isExporting ? 'Exporting...' : 'Export CSV'}
        </Button>
        {canCreate && (
          <Link href="/sessions/new">
            <Button>Log New Session</Button>
          </Link>
        )}
      </div>
    </div>
  )
}
