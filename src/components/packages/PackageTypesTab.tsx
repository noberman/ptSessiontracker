'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { PackageTypeForm } from './PackageTypeForm'
import { toast } from 'react-hot-toast'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface PackageType {
  id: string
  name: string
  defaultSessions?: number | null
  defaultPrice?: number | null
  isActive: boolean
  sortOrder: number
  _count?: {
    packages: number
  }
}

function SortablePackageTypeItem({ 
  type, 
  onEdit, 
  onToggleActive,
  onClone
}: { 
  type: PackageType
  onEdit: (type: PackageType) => void
  onToggleActive: (type: PackageType) => void
  onClone: (type: PackageType) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: type.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-2 flex-1">
            <div
              {...attributes}
              {...listeners}
              className="mt-1 cursor-move text-text-secondary hover:text-text-primary"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M7 2a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM7 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM7 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM17 2a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM17 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM17 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-text-primary">
                  {type.name}
                </h3>
                <Badge variant={type.isActive ? 'success' : 'secondary'}>
                  {type.isActive ? 'Active' : 'Inactive'}
                </Badge>
                {type._count && type._count.packages > 0 && (
                  <Badge variant="secondary">
                    {type._count.packages} packages
                  </Badge>
                )}
              </div>
              <div className="flex gap-4 mt-2 text-sm text-text-secondary">
                {type.defaultSessions && (
                  <span>Default sessions: {type.defaultSessions}</span>
                )}
                {type.defaultPrice && (
                  <span>Default price: ${type.defaultPrice}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onClone(type)}
              title="Clone this package type"
            >
              Clone
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onEdit(type)}
            >
              Edit
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onToggleActive(type)}
            >
              {type.isActive ? 'Deactivate' : 'Activate'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

export function PackageTypesTab() {
  const [packageTypes, setPackageTypes] = useState<PackageType[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingType, setEditingType] = useState<PackageType | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    fetchPackageTypes()
  }, [])

  const fetchPackageTypes = async () => {
    try {
      const response = await fetch('/api/package-types?includeInactive=true')
      if (response.ok) {
        const data = await response.json()
        setPackageTypes(data)
      } else {
        toast.error('Failed to fetch package types')
      }
    } catch (error) {
      console.error('Error fetching package types:', error)
      toast.error('Error loading package types')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActive = async (type: PackageType) => {
    try {
      const response = await fetch(`/api/package-types/${type.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !type.isActive })
      })

      if (response.ok) {
        toast.success(`Package type ${!type.isActive ? 'activated' : 'deactivated'}`)
        fetchPackageTypes()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update package type')
      }
    } catch (error) {
      console.error('Error toggling package type:', error)
      toast.error('Error updating package type')
    }
  }

  const handleEdit = (type: PackageType) => {
    // If already editing a different type, close that form first
    if (editingType && editingType.id !== type.id) {
      setEditingType(null)
      setShowForm(false)
      // Small delay to allow UI to update
      setTimeout(() => {
        setEditingType(type)
        setShowForm(true)
      }, 100)
    } else {
      setEditingType(type)
      setShowForm(true)
    }
  }

  const handleClone = (type: PackageType) => {
    // Create a clone with modified name
    const clonedType = {
      ...type,
      id: undefined, // Remove ID so it creates new
      name: `${type.name} (Copy)`,
      sortOrder: packageTypes.length, // Put at end
      _count: undefined // Remove usage count
    }
    setEditingType(clonedType)
    setShowForm(true)
  }

  const handleFormClose = () => {
    setShowForm(false)
    setEditingType(null)
    fetchPackageTypes()
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    const oldIndex = packageTypes.findIndex((type) => type.id === active.id)
    const newIndex = packageTypes.findIndex((type) => type.id === over.id)

    const reorderedTypes = arrayMove(packageTypes, oldIndex, newIndex)
    
    // Update local state immediately for responsive UI
    setPackageTypes(reorderedTypes)

    // Update sort orders
    const updates = reorderedTypes.map((type, index) => ({
      id: type.id,
      sortOrder: index
    }))

    try {
      // Send batch update to API
      const response = await fetch('/api/package-types/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      })

      if (!response.ok) {
        toast.error('Failed to update sort order')
        // Revert on error
        fetchPackageTypes()
      }
    } catch (error) {
      console.error('Error updating sort order:', error)
      toast.error('Error updating sort order')
      // Revert on error
      fetchPackageTypes()
    }
  }

  if (loading) {
    return <div className="text-text-secondary">Loading package types...</div>
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Package Types</h2>
          <p className="text-sm text-text-secondary mt-1">
            Define the categories of packages your organization offers
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          Add Package Type
        </Button>
      </div>

      {showForm && (
        <div className="mb-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              {editingType ? (editingType.id ? 'Edit Package Type' : 'Clone Package Type') : 'New Package Type'}
            </h3>
            <PackageTypeForm 
              packageType={editingType}
              onSuccess={handleFormClose}
              onCancel={() => {
                setShowForm(false)
                setEditingType(null)
              }}
            />
          </Card>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={packageTypes.map(t => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-4">
            {packageTypes.map((type) => (
              <SortablePackageTypeItem
                key={type.id}
                type={type}
                onEdit={handleEdit}
                onToggleActive={handleToggleActive}
                onClone={handleClone}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {packageTypes.length === 0 && (
        <Card className="p-6 text-center text-text-secondary">
          No package types defined yet. Click "Add Package Type" to create your first one.
        </Card>
      )}
    </div>
  )
}