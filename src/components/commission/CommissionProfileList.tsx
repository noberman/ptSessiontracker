'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  TrendingUp,
  DollarSign,
  Layers,
  ChevronRight 
} from 'lucide-react'
import { CommissionProfileModal } from './CommissionProfileModal'
import { DeleteProfileDialog } from './DeleteProfileDialog'

interface CommissionProfile {
  id: string
  name: string
  description: string | null
  isDefault: boolean
  isActive: boolean
  calculationMethod: 'PROGRESSIVE' | 'GRADUATED' | 'FLAT'
  _count: {
    users: number
  }
  tiers: Array<{
    id: string
    tierLevel: number
    name: string
    triggerType: string
    sessionThreshold: number | null
    salesThreshold: number | null
    sessionCommissionPercent: number | null
    sessionFlatFee: number | null
    salesCommissionPercent: number | null
    salesFlatFee: number | null
    tierBonus: number | null
  }>
}

interface CommissionProfileListProps {
  userRole: string
}

export function CommissionProfileList({ userRole }: CommissionProfileListProps) {
  const [profiles, setProfiles] = useState<CommissionProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedProfile, setSelectedProfile] = useState<CommissionProfile | null>(null)
  const [profileToDelete, setProfileToDelete] = useState<CommissionProfile | null>(null)
  
  const canEdit = userRole === 'ADMIN'

  useEffect(() => {
    fetchProfiles()
  }, [])

  const fetchProfiles = async () => {
    try {
      const response = await fetch('/api/commission/profiles')
      if (response.ok) {
        const data = await response.json()
        setProfiles(data)
      }
    } catch (error) {
      console.error('Error fetching profiles:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (profile: CommissionProfile) => {
    setSelectedProfile(profile)
    setShowModal(true)
  }

  const handleDelete = (profile: CommissionProfile) => {
    setProfileToDelete(profile)
    setShowDeleteDialog(true)
  }

  const handleCreate = () => {
    setSelectedProfile(null)
    setShowModal(true)
  }

  const handleModalClose = () => {
    setShowModal(false)
    setSelectedProfile(null)
    fetchProfiles()
  }

  const handleDeleteConfirm = async () => {
    if (!profileToDelete) return

    try {
      const response = await fetch(`/api/commission/profiles/${profileToDelete.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchProfiles()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete profile')
      }
    } catch (error) {
      console.error('Error deleting profile:', error)
      alert('Failed to delete profile')
    } finally {
      setShowDeleteDialog(false)
      setProfileToDelete(null)
    }
  }

  const getMethodBadgeVariant = (method: string) => {
    switch (method) {
      case 'PROGRESSIVE':
        return 'primary'
      case 'GRADUATED':
        return 'secondary'
      case 'FLAT':
        return 'default'
      default:
        return 'default'
    }
  }

  const getCommissionSummary = (profile: CommissionProfile) => {
    if (profile.tiers.length === 0) return 'No tiers configured'
    
    const firstTier = profile.tiers[0]
    const lastTier = profile.tiers[profile.tiers.length - 1]
    
    // Build summary based on available rates
    const parts: string[] = []
    
    // Session commission
    if (firstTier.sessionFlatFee) {
      if (profile.tiers.length === 1) {
        parts.push(`$${firstTier.sessionFlatFee}/session`)
      } else {
        parts.push(`$${firstTier.sessionFlatFee}-${lastTier.sessionFlatFee}/session`)
      }
    } else if (firstTier.sessionCommissionPercent) {
      if (profile.tiers.length === 1) {
        parts.push(`${firstTier.sessionCommissionPercent}%`)
      } else {
        parts.push(`${firstTier.sessionCommissionPercent}-${lastTier.sessionCommissionPercent}%`)
      }
    }
    
    // Sales commission
    if (firstTier.salesCommissionPercent) {
      parts.push(`${firstTier.salesCommissionPercent}% sales`)
    } else if (firstTier.salesFlatFee) {
      parts.push(`$${firstTier.salesFlatFee}/sale`)
    }
    
    // Bonuses
    const hasBonus = profile.tiers.some(t => t.tierBonus && t.tierBonus > 0)
    if (hasBonus) {
      parts.push('+ bonuses')
    }
    
    return parts.join(' • ') || 'Custom structure'
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-text-secondary">Loading profiles...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex justify-end">
          <Button onClick={handleCreate} size="md">
            <Plus className="w-4 h-4 mr-2" />
            Create Profile
          </Button>
        </div>
      )}

      <div className="grid gap-4">
        {profiles.map((profile) => (
          <Card key={profile.id} className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-text-primary">
                    {profile.name}
                  </h3>
                  {profile.isDefault && (
                    <Badge variant="default" size="sm">Default</Badge>
                  )}
                  <Badge 
                    variant={getMethodBadgeVariant(profile.calculationMethod)} 
                    size="sm"
                  >
                    {profile.calculationMethod}
                  </Badge>
                </div>

                {profile.description && (
                  <p className="text-sm text-text-secondary mb-3">
                    {profile.description}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <div className="flex items-center gap-1 text-text-secondary">
                    <Layers className="w-4 h-4" />
                    <span>{profile.tiers.length} tiers</span>
                  </div>
                  
                  <div className="flex items-center gap-1 text-text-secondary">
                    <Users className="w-4 h-4" />
                    <span>{profile._count.users} trainers</span>
                  </div>

                  <div className="flex items-center gap-1 text-primary-600">
                    <DollarSign className="w-4 h-4" />
                    <span className="font-medium">{getCommissionSummary(profile)}</span>
                  </div>
                </div>

                {profile.tiers.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <div className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                      Tier Structure:
                    </div>
                    <div className="grid gap-2">
                      {profile.tiers.slice(0, 3).map((tier) => (
                        <div 
                          key={tier.id} 
                          className="flex items-center gap-3 text-sm bg-background-secondary rounded-md px-3 py-2"
                        >
                          <div className="flex items-center gap-2 flex-1">
                            <span className="font-medium text-text-primary">
                              {tier.name}
                            </span>
                            {tier.sessionThreshold && (
                              <span className="text-text-secondary">
                                ({tier.sessionThreshold}+ sessions)
                              </span>
                            )}
                          </div>
                          <ChevronRight className="w-4 h-4 text-text-tertiary" />
                          <div className="text-primary-600 font-medium">
                            {tier.sessionFlatFee 
                              ? `$${tier.sessionFlatFee}/session`
                              : tier.sessionCommissionPercent 
                                ? `${tier.sessionCommissionPercent}%`
                                : 'Custom'
                            }
                          </div>
                        </div>
                      ))}
                      {profile.tiers.length > 3 && (
                        <div className="text-sm text-text-secondary pl-3">
                          +{profile.tiers.length - 3} more tiers...
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {canEdit && (
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(profile)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  {!profile.isDefault && profile._count.users === 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(profile)}
                      className="text-error-600 hover:bg-error-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </Card>
        ))}

        {profiles.length === 0 && (
          <Card className="p-12 text-center">
            <p className="text-text-secondary">
              No commission profiles found. Create your first profile to get started.
            </p>
          </Card>
        )}
      </div>

      {showModal && (
        <CommissionProfileModal
          profile={selectedProfile}
          onClose={handleModalClose}
        />
      )}

      {showDeleteDialog && profileToDelete && (
        <DeleteProfileDialog
          profile={profileToDelete}
          onClose={() => {
            setShowDeleteDialog(false)
            setProfileToDelete(null)
          }}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  )
}