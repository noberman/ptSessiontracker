'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { signOut } from 'next-auth/react'
import { 
  Users, 
  Calendar, 
  Package, 
  Download, 
  LogIn,
  Search,
  Building,
  Shield,
  Upload,
  Trash2,
  LogOut,
  Sparkles,
  CreditCard
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { getSubscriptionDisplayName } from '@/lib/subscription-utils'
import BetaModal from './BetaModal'

interface Organization {
  id: string
  name: string
  email: string
  subscriptionTier: string
  createdAt: Date
  userCount: number
  sessionCount: number
  clientCount: number
  lastActivity: Date
  isClone?: boolean
  clonedFrom?: string | null
  betaAccess?: boolean
  betaExpiresAt?: Date | null
}

interface SuperAdminDashboardProps {
  organizations: Organization[]
}

export default function SuperAdminDashboard({ organizations }: SuperAdminDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [betaModalOrg, setBetaModalOrg] = useState<Organization | null>(null)

  const filteredOrgs = organizations.filter(org => 
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleLoginAs = async (orgId: string) => {
    console.log('🔐 Login As clicked for org:', orgId)
    setLoading(`login-${orgId}`)
    try {
      const response = await fetch(`/api/super-admin/login-as`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: orgId })
      })
      
      console.log('📡 Login As response status:', response.status)
      
      const data = await response.json()
      console.log('📦 Login As response data:', data)
      
      if (!response.ok) {
        console.error('❌ Login As failed:', data.error)
        alert(`Login As failed: ${data.error || 'Unknown error'}`)
        return
      }
      
      if (data.url) {
        console.log('🚀 Opening new tab with URL:', data.url)
        // Open in new tab with session isolation
        const newWindow = window.open(data.url, '_blank', 'noopener,noreferrer')
        if (!newWindow) {
          console.error('❌ Failed to open new tab - popup may be blocked')
          alert('Failed to open new tab - please check popup blocker')
        } else {
          // Inform user about the separate session
          console.log('✅ Opened in new tab - this is a separate session')
        }
      } else {
        console.error('❌ No URL in response')
        alert('No URL received from server')
      }
    } catch (error) {
      console.error('❌ Login As error:', error)
      alert('Failed to create login session')
    } finally {
      setLoading(null)
    }
  }

  const handleDeleteAllClones = async () => {
    if (!confirm('Are you sure you want to delete ALL clone organizations? This cannot be undone.')) {
      return
    }

    setDeleting(true)
    try {
      const response = await fetch('/api/super-admin/delete-clones', {
        method: 'DELETE'
      })

      const data = await response.json()
      
      if (!response.ok) {
        alert(`Delete failed: ${data.error || 'Unknown error'}`)
        return
      }

      alert(`Successfully deleted ${data.count} clone organizations`)
      // Refresh the page to update the list
      window.location.reload()
    } catch (error) {
      console.error('Delete clones error:', error)
      alert('Failed to delete clones')
    } finally {
      setDeleting(false)
    }
  }

  const handleRevokeBeta = async (orgId: string) => {
    if (!confirm('Are you sure you want to revoke beta access?')) {
      return
    }
    
    setLoading(`revoke-${orgId}`)
    try {
      const response = await fetch('/api/super-admin/revoke-beta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: orgId })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        alert(`Failed to revoke beta: ${data.error || 'Unknown error'}`)
        return
      }
      
      alert('Beta access revoked')
      window.location.reload()
    } catch (error) {
      console.error('Revoke beta error:', error)
      alert('Failed to revoke beta access')
    } finally {
      setLoading(null)
    }
  }

  const handleChangeTier = async (orgId: string, newTier: string) => {
    if (!confirm(`Change organization to ${newTier} tier?`)) {
      return
    }
    
    setLoading(`tier-${orgId}`)
    try {
      const response = await fetch('/api/super-admin/change-tier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          organizationId: orgId,
          tier: newTier 
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        alert(`Failed to change tier: ${data.error || 'Unknown error'}`)
        return
      }
      
      alert(`Tier changed to ${newTier}`)
      window.location.reload()
    } catch (error) {
      console.error('Change tier error:', error)
      alert('Failed to change tier')
    } finally {
      setLoading(null)
    }
  }

  const handleExportData = async (orgId: string) => {
    setLoading(`export-${orgId}`)
    try {
      const response = await fetch(`/api/super-admin/export?organizationId=${orgId}`)
      const data = await response.json()
      
      // Download as JSON
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${orgId}_export_${Date.now()}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to export data')
    } finally {
      setLoading(null)
    }
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'FREE': return 'bg-gray-100 text-gray-700'
      case 'GROWTH': return 'bg-blue-100 text-blue-700'
      case 'SCALE': return 'bg-purple-100 text-purple-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-red-600 text-white p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6" />
              Super Admin Dashboard
            </h1>
            <p className="text-red-100 text-sm mt-1">
              Beta Management & Debugging Tools
            </p>
          </div>
          <div className="flex items-center gap-2">
            {process.env.NODE_ENV === 'development' && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => window.location.href = '/super-admin/import-clone'}
                  className="flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Import Clone
                </Button>
                {organizations.some(org => org.isClone) && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleDeleteAllClones}
                    disabled={deleting}
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    {deleting ? 'Deleting...' : 'Delete All Clones'}
                  </Button>
                )}
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="flex items-center gap-2 bg-white text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Organizations</p>
                <p className="text-2xl font-bold">{organizations.length}</p>
              </div>
              <Building className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Users</p>
                <p className="text-2xl font-bold">
                  {organizations.reduce((sum, org) => sum + org.userCount, 0)}
                </p>
              </div>
              <Users className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Sessions</p>
                <p className="text-2xl font-bold">
                  {organizations.reduce((sum, org) => sum + org.sessionCount, 0)}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search organizations..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Organizations Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Organization
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stats
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Activity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrgs.map((org) => (
                <tr key={org.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                        {org.name}
                        {org.isClone && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-700">
                            CLONE
                          </span>
                        )}
                        {org.betaAccess && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">
                            BETA
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">{org.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTierColor(org.subscriptionTier)}`}>
                        {getSubscriptionDisplayName(org.subscriptionTier)}
                      </span>
                      {org.betaAccess && (
                        <span className="text-xs text-gray-500">
                          Beta: {org.betaExpiresAt 
                            ? `Expires ${new Date(org.betaExpiresAt).toLocaleDateString()}`
                            : 'Indefinite'
                          }
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-gray-400" />
                          {org.userCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <Package className="h-4 w-4 text-gray-400" />
                          {org.clientCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          {org.sessionCount}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {formatDistanceToNow(new Date(org.lastActivity), { addSuffix: true })}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleLoginAs(org.id)}
                          disabled={loading === `login-${org.id}`}
                          className="flex items-center gap-1"
                        >
                          <LogIn className="h-3 w-3" />
                          Login As
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleExportData(org.id)}
                          disabled={loading === `export-${org.id}`}
                          className="flex items-center gap-1"
                        >
                          <Download className="h-3 w-3" />
                          Export
                        </Button>
                      </div>
                      <div className="flex gap-2 items-center">
                        {!org.betaAccess ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setBetaModalOrg(org)}
                            className="flex items-center gap-1 text-yellow-600 hover:bg-yellow-50"
                          >
                            <Sparkles className="h-3 w-3" />
                            Grant Beta
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRevokeBeta(org.id)}
                            disabled={loading === `revoke-${org.id}`}
                            className="flex items-center gap-1 text-red-600 hover:bg-red-50"
                          >
                            Revoke Beta
                          </Button>
                        )}
                        <select
                          onChange={(e) => handleChangeTier(org.id, e.target.value)}
                          className="text-xs px-2 py-1 border rounded"
                          defaultValue=""
                        >
                          <option value="" disabled>Change Tier</option>
                          <option value="FREE">FREE</option>
                          <option value="GROWTH">GROWTH</option>
                          <option value="SCALE">SCALE</option>
                        </select>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
      
      {/* Beta Modal */}
      {betaModalOrg && (
        <BetaModal
          organizationId={betaModalOrg.id}
          organizationName={betaModalOrg.name}
          currentTier={betaModalOrg.subscriptionTier}
          onClose={() => setBetaModalOrg(null)}
          onSuccess={() => {
            setBetaModalOrg(null)
            window.location.reload()
          }}
        />
      )}
    </div>
  )
}