'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { CheckCircle, Circle, ChevronRight, X } from 'lucide-react'
import Link from 'next/link'

interface ChecklistItem {
  id: string
  label: string
  completed: boolean
  href?: string
}

export function SetupChecklist() {
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [dismissed, setDismissed] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if already dismissed
    const isDismissed = localStorage.getItem('setup_checklist_dismissed') === 'true'
    if (isDismissed) {
      setDismissed(true)
      setLoading(false)
      return
    }

    // Check onboarding status
    const progress = JSON.parse(localStorage.getItem('onboarding_progress') || '{}')
    const onboardingCompleted = localStorage.getItem('onboarding_completed') === 'true'
    
    // Fetch actual data to determine checklist
    fetchSetupStatus()
  }, [])

  const fetchSetupStatus = async () => {
    try {
      // Check various setup items
      const [clientsRes, packagesRes, sessionsRes, invitationsRes] = await Promise.all([
        fetch('/api/clients'),
        fetch('/api/packages'),
        fetch('/api/sessions?limit=1'),
        fetch('/api/invitations'),
      ])

      const clients = await clientsRes.json()
      const packages = await packagesRes.json()
      const sessions = await sessionsRes.json()
      const invitations = await invitationsRes.json()

      const checklistItems: ChecklistItem[] = [
        {
          id: 'clients',
          label: 'Add your first client',
          completed: clients.length > 0,
          href: '/clients/new'
        },
        {
          id: 'packages',
          label: 'Create a training package',
          completed: packages.length > 0,
          href: '/packages/new'
        },
        {
          id: 'session',
          label: 'Log your first session',
          completed: sessions.sessions?.length > 0,
          href: '/sessions/log'
        },
        {
          id: 'team',
          label: 'Invite team members',
          completed: invitations.length > 0,
          href: '/settings/team'
        },
      ]

      setItems(checklistItems)
      
      // Auto-dismiss if all completed
      if (checklistItems.every(item => item.completed)) {
        handleDismiss()
      }
    } catch (error) {
      console.error('Failed to fetch setup status:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDismiss = () => {
    localStorage.setItem('setup_checklist_dismissed', 'true')
    setDismissed(true)
  }

  if (loading || dismissed || items.length === 0) {
    return null
  }

  const completedCount = items.filter(item => item.completed).length
  const totalCount = items.length
  const completionPercentage = (completedCount / totalCount) * 100

  return (
    <Card className="p-4 mb-6 bg-gradient-to-r from-primary-50 to-primary-100 border-primary-200">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-text-primary mb-1">
            Getting Started with FitSync
          </h3>
          <p className="text-sm text-text-secondary">
            Complete these steps to get the most out of FitSync
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-text-secondary hover:text-text-primary transition-colors"
          aria-label="Dismiss checklist"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-white rounded-full h-2 mb-4">
        <div 
          className="bg-primary h-2 rounded-full transition-all duration-500"
          style={{ width: `${completionPercentage}%` }}
        />
      </div>

      {/* Checklist items */}
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {item.completed ? (
                <CheckCircle className="w-5 h-5 text-success-600" />
              ) : (
                <Circle className="w-5 h-5 text-text-secondary" />
              )}
              <span className={`text-sm ${
                item.completed ? 'text-text-secondary line-through' : 'text-text-primary'
              }`}>
                {item.label}
              </span>
            </div>
            {!item.completed && item.href && (
              <Link href={item.href}>
                <Button size="sm" variant="ghost">
                  Start
                  <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            )}
          </div>
        ))}
      </div>

      {completedCount === totalCount && (
        <div className="mt-4 p-3 bg-success-50 rounded-lg text-center">
          <p className="text-sm text-success-700 font-medium">
            🎉 Congratulations! You&apos;ve completed all setup steps!
          </p>
        </div>
      )}
    </Card>
  )
}