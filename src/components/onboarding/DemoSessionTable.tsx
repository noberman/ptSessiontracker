'use client'

import { format } from 'date-fns'
import { Badge } from '@/components/ui/Badge'

interface DemoSession {
  id: string
  sessionDate: Date
  trainer: { name: string; email: string }
  client: { name: string; email: string }
  location: { name: string }
  package: { name: string }
  sessionValue: number
  validated: boolean
  isHighlighted?: boolean
}

interface DemoSessionTableProps {
  sessions: DemoSession[]
  highlightedId?: string
}

export function DemoSessionTable({ sessions, highlightedId }: DemoSessionTableProps) {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trainer</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Package</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sessions.map((session) => (
              <tr
                key={session.id}
                className={`
                  ${highlightedId === session.id ? 'bg-primary-50 ring-2 ring-primary ring-inset' : 'hover:bg-gray-50'}
                  transition-all duration-300
                `}
              >
                <td className="px-4 py-3 text-sm">
                  {format(session.sessionDate, 'MM/dd/yyyy')}
                </td>
                <td className="px-4 py-3">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{session.trainer.name}</div>
                    <div className="text-xs text-gray-500">{session.trainer.email}</div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div>
                    <div className="text-sm text-gray-900">{session.client.name}</div>
                    <div className="text-xs text-gray-500">{session.client.email}</div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {session.location.name}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {session.package.name}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  ${session.sessionValue.toFixed(2)}
                </td>
                <td className="px-4 py-3">
                  {session.validated ? (
                    <Badge variant="success">Validated</Badge>
                  ) : (
                    <Badge variant="warning">Pending</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}