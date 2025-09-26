'use client'

import { Badge } from '@/components/ui/Badge'

interface CommissionData {
  trainer: { name: string; email: string }
  sessionsCount: number
  currentTier: string
  rate: number
  sessionValue: number
  commission: number
  isHighlighted?: boolean
}

interface DemoCommissionReportProps {
  commissions: CommissionData[]
  highlightedEmail?: string
}

export function DemoCommissionReport({ commissions, highlightedEmail }: DemoCommissionReportProps) {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b">
        <h3 className="text-lg font-semibold">Trainer Commissions</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trainer</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Sessions</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Tier</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Rate</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Session Value</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Commission</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {commissions.map((data) => (
              <tr
                key={data.trainer.email}
                className={`
                  ${highlightedEmail === data.trainer.email 
                    ? 'bg-primary-50 ring-2 ring-primary ring-inset' 
                    : 'hover:bg-gray-50'}
                  transition-all duration-300
                `}
              >
                <td className="px-4 py-3">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{data.trainer.name}</div>
                    <div className="text-xs text-gray-500">{data.trainer.email}</div>
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="inline-flex items-center justify-center w-8 h-8 bg-primary-100 text-primary-700 rounded-full text-sm font-medium">
                    {data.sessionsCount}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={
                    data.currentTier === 'Tier 3' ? 'success' : 
                    data.currentTier === 'Tier 2' ? 'secondary' : 
                    'default'
                  }>
                    {data.currentTier}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-center text-sm font-medium">
                  {data.rate}%
                </td>
                <td className="px-4 py-3 text-right text-sm font-medium">
                  ${data.sessionValue.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-lg font-bold text-primary">
                    ${data.commission.toFixed(2)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-6 py-4 bg-gray-50 border-t">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Total Commission This Month</span>
          <span className="text-xl font-bold text-primary">
            ${commissions.reduce((sum, c) => sum + c.commission, 0).toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  )
}