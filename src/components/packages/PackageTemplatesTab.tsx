'use client'

import { Card } from '@/components/ui/Card'

export function PackageTemplatesTab() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-text-primary">Package Templates</h2>
        <p className="text-sm text-text-secondary mt-1">
          Pre-configured package templates for quick package creation
        </p>
      </div>

      <Card className="p-6 text-center text-text-secondary">
        <p>Package templates feature coming soon.</p>
        <p className="text-sm mt-2">This will allow you to create reusable package configurations.</p>
      </Card>
    </div>
  )
}