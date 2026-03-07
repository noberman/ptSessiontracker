'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Switch } from '@/components/ui/switch'

interface NoShowCommissionToggleProps {
  organizationId: string
  initialValue: boolean
}

export function NoShowCommissionToggle({ organizationId, initialValue }: NoShowCommissionToggleProps) {
  const [enabled, setEnabled] = useState(initialValue)
  const [saving, setSaving] = useState(false)

  async function handleToggle(checked: boolean) {
    setSaving(true)
    try {
      const res = await fetch(`/api/organizations/${organizationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commissionIncludesNoShows: checked }),
      })
      if (res.ok) {
        setEnabled(checked)
      }
    } catch {
      // Revert on error
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="p-4 border border-border">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Include no-shows in commission</h3>
          <p className="text-xs text-text-secondary mt-0.5">
            When enabled, no-show sessions count toward trainer commission calculations
          </p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={handleToggle}
          disabled={saving}
        />
      </div>
    </Card>
  )
}
