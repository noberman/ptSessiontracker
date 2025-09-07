'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface PackageTemplate {
  id: string
  name: string
  displayName: string
  category: string
  sessions: number
  price: number
  sessionValue: number
  active: boolean
  sortOrder: number
}

interface PackageTemplatesTableProps {
  templates: PackageTemplate[]
}

export function PackageTemplatesTable({ templates }: PackageTemplatesTableProps) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the template "${name}"?`)) {
      return
    }

    setDeletingId(id)
    try {
      const response = await fetch(`/api/package-templates/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete template')
      }

      router.refresh()
    } catch (error) {
      console.error('Failed to delete template:', error)
      alert('Failed to delete template')
    } finally {
      setDeletingId(null)
    }
  }

  // Group templates by category
  const groupedTemplates = templates.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = []
    }
    acc[template.category].push(template)
    return acc
  }, {} as Record<string, PackageTemplate[]>)

  const categoryOrder = ['Prime', 'Elite', 'Transformation', 'Intro', 'Custom']
  const sortedCategories = Object.keys(groupedTemplates).sort((a, b) => {
    const aIndex = categoryOrder.indexOf(a)
    const bIndex = categoryOrder.indexOf(b)
    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b)
    if (aIndex === -1) return 1
    if (bIndex === -1) return -1
    return aIndex - bIndex
  })

  return (
    <div className="space-y-6">
      {sortedCategories.map(category => (
        <div key={category} className="rounded-lg border bg-white shadow-sm">
          <div className="border-b px-6 py-3 bg-gray-50">
            <h3 className="font-semibold text-text-primary">{category} Packages</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full divide-y">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Display Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Internal Name
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Sessions
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Per Session
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Sort Order
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y">
                {groupedTemplates[category].map((template) => (
                  <tr key={template.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary">
                      {template.displayName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                      {template.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary text-center">
                      {template.sessions}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary text-right">
                      ${template.price.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary text-right">
                      ${template.sessionValue.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex px-2 text-xs font-semibold rounded-full ${
                        template.active 
                          ? 'bg-success-100 text-success-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {template.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary text-center">
                      {template.sortOrder}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                      <div className="flex items-center justify-center gap-2">
                        <Link href={`/package-templates/${template.id}/edit`}>
                          <Button variant="outline" size="sm">
                            Edit
                          </Button>
                        </Link>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDelete(template.id, template.displayName)}
                          disabled={deletingId === template.id}
                          className="text-error-600 hover:bg-error-50"
                        >
                          {deletingId === template.id ? 'Deleting...' : 'Delete'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      
      {templates.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border">
          <p className="text-text-secondary">No package templates found</p>
        </div>
      )}
    </div>
  )
}