'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { toast } from 'react-hot-toast'

interface TrainerOption {
  id: string
  name: string
  email: string
}

interface AppointmentCreateModalProps {
  isOpen: boolean
  onClose: () => void
  trainerId: string
  trainerName: string
  trainers?: TrainerOption[]
  date: string // YYYY-MM-DD
  time: string // HH:mm
  onCreated: () => void
}

interface ClientOption {
  id: string
  name: string
  email: string
}

interface PackageOption {
  id: string
  name: string
  remainingSessions: number
}

const DURATION_OPTIONS = [15, 30, 45, 60, 75, 90, 120]


export function AppointmentCreateModal({
  isOpen,
  onClose,
  trainerId,
  trainerName,
  trainers,
  date,
  time,
  onCreated,
}: AppointmentCreateModalProps) {
  const [type, setType] = useState<'SESSION' | 'FITNESS_ASSESSMENT'>('SESSION')
  const [selectedDate, setSelectedDate] = useState(date)
  const [selectedTime, setSelectedTime] = useState(time)
  const [duration, setDuration] = useState(60)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  // Client search
  const [clientSearch, setClientSearch] = useState('')
  const [clients, setClients] = useState<ClientOption[]>([])
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null)
  const [clientPackages, setClientPackages] = useState<PackageOption[]>([])
  const [selectedPackageId, setSelectedPackageId] = useState('')
  const [searchLoading, setSearchLoading] = useState(false)

  // Prospect fields (FITNESS_ASSESSMENT without client)
  const [useProspect, setUseProspect] = useState(false)
  const [prospectName, setProspectName] = useState('')
  const [prospectEmail, setProspectEmail] = useState('')

  // Multi-trainer mode: selected trainer
  const [chosenTrainerId, setChosenTrainerId] = useState(trainerId)
  const hasMultipleTrainers = trainers && trainers.length > 1
  const activeTrainerId = hasMultipleTrainers ? chosenTrainerId : trainerId

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setType('SESSION')
      setSelectedDate(date)
      setSelectedTime(time)
      setDuration(60)
      setNotes('')
      setClientSearch('')
      setClients([])
      setSelectedClient(null)
      setClientPackages([])
      setSelectedPackageId('')
      setUseProspect(false)
      setProspectName('')
      setProspectEmail('')
      setChosenTrainerId(trainerId)
    }
  }, [isOpen, date, time, trainerId])

  // Search clients
  useEffect(() => {
    if (clientSearch.length < 2) {
      setClients([])
      return
    }
    const timeout = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const res = await fetch(`/api/clients?search=${encodeURIComponent(clientSearch)}&limit=10`)
        if (res.ok) {
          const data = await res.json()
          const list = data.clients || data
          setClients(
            list.map((c: Record<string, unknown>) => ({
              id: c.id as string,
              name: c.name as string,
              email: c.email as string,
            }))
          )
        }
      } catch {
        // ignore search errors
      } finally {
        setSearchLoading(false)
      }
    }, 300)
    return () => clearTimeout(timeout)
  }, [clientSearch])

  // Fetch packages when client is selected
  const handleSelectClient = async (client: ClientOption) => {
    setSelectedClient(client)
    setClientSearch('')
    setClients([])
    setClientPackages([])
    setSelectedPackageId('')

    try {
      const res = await fetch(`/api/packages?clientId=${client.id}&active=true&hasRemaining=true`)
      if (res.ok) {
        const data = await res.json()
        const pkgs = (data.packages || data) as Record<string, unknown>[]
        const mapped = pkgs.map((p) => ({
          id: p.id as string,
          name: p.name as string,
          remainingSessions: p.remainingSessions as number,
        }))
        setClientPackages(mapped)
        if (mapped.length > 0) {
          setSelectedPackageId(mapped[0].id)
        }
      }
    } catch {
      // ignore
    }
  }

  const handleSubmit = async () => {
    if (type === 'SESSION' && !selectedClient) {
      toast.error('Please select a client for a session appointment')
      return
    }

    if (type === 'FITNESS_ASSESSMENT' && !selectedClient && useProspect) {
      if (!prospectName || !prospectEmail) {
        toast.error('Please enter prospect name and email')
        return
      }
    }

    if (type === 'FITNESS_ASSESSMENT' && !selectedClient && !useProspect) {
      toast.error('Please select a client or enter prospect details')
      return
    }

    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        trainerId: activeTrainerId,
        type,
        scheduledAt: `${selectedDate} ${selectedTime}`,
        duration,
        notes: notes || undefined,
      }

      if (selectedClient) {
        body.clientId = selectedClient.id
        if (type === 'SESSION' && selectedPackageId) {
          body.packageId = selectedPackageId
        }
      } else if (useProspect) {
        body.prospectName = prospectName
        body.prospectEmail = prospectEmail
      }

      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create appointment')
      }

      toast.success('Appointment created')
      onCreated()
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create appointment')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Appointment" size="lg">
      <div className="space-y-4">
        {/* Trainer */}
        {hasMultipleTrainers ? (
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Trainer</label>
            <select
              value={chosenTrainerId}
              onChange={(e) => setChosenTrainerId(e.target.value)}
              className="w-full max-w-[300px] px-3 py-2 border border-border rounded-md bg-background-primary text-text-primary text-sm"
            >
              {trainers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name || t.email}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="text-sm text-text-secondary">
            Trainer: <span className="font-medium text-text-primary">{trainerName}</span>
          </div>
        )}

        {/* Date & Time */}
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[140px]">
            <label className="block text-sm font-medium text-text-primary mb-1">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background-primary text-text-primary text-sm"
            />
          </div>
          <div className="min-w-[120px]">
            <label className="block text-sm font-medium text-text-primary mb-1">Time</label>
            <input
              type="time"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              step={900}
              className="w-full px-3 py-2 border border-border rounded-md bg-background-primary text-text-primary text-sm"
            />
          </div>
        </div>

        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">Type</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setType('SESSION'); setUseProspect(false) }}
              className={`px-4 py-2 text-sm rounded-md border transition-colors ${
                type === 'SESSION'
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'border-border text-text-secondary hover:text-text-primary'
              }`}
            >
              Session
            </button>
            <button
              type="button"
              onClick={() => setType('FITNESS_ASSESSMENT')}
              className={`px-4 py-2 text-sm rounded-md border transition-colors ${
                type === 'FITNESS_ASSESSMENT'
                  ? 'bg-orange-50 border-orange-300 text-orange-700'
                  : 'border-border text-text-secondary hover:text-text-primary'
              }`}
            >
              Fitness Assessment
            </button>
          </div>
        </div>

        {/* Client / Prospect */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            {type === 'SESSION' ? 'Client' : 'Client or Prospect'}
          </label>

          {selectedClient ? (
            <div className="flex items-center justify-between py-2 px-3 bg-background-secondary rounded-md">
              <div>
                <span className="text-sm font-medium text-text-primary">{selectedClient.name}</span>
                <span className="text-sm text-text-secondary ml-2">{selectedClient.email}</span>
              </div>
              <button
                type="button"
                onClick={() => { setSelectedClient(null); setClientPackages([]); setSelectedPackageId('') }}
                className="text-xs text-text-tertiary hover:text-red-500"
              >
                Change
              </button>
            </div>
          ) : (
            <>
              {type === 'FITNESS_ASSESSMENT' && (
                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setUseProspect(false)}
                    className={`px-3 py-1 text-xs rounded-md border ${
                      !useProspect ? 'bg-primary/10 border-primary text-primary' : 'border-border text-text-secondary'
                    }`}
                  >
                    Existing Client
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseProspect(true)}
                    className={`px-3 py-1 text-xs rounded-md border ${
                      useProspect ? 'bg-primary/10 border-primary text-primary' : 'border-border text-text-secondary'
                    }`}
                  >
                    New Prospect
                  </button>
                </div>
              )}

              {useProspect ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Prospect name"
                    value={prospectName}
                    onChange={(e) => setProspectName(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background-primary text-text-primary text-sm"
                  />
                  <input
                    type="email"
                    placeholder="Prospect email"
                    value={prospectEmail}
                    onChange={(e) => setProspectEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background-primary text-text-primary text-sm"
                  />
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search clients..."
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background-primary text-text-primary text-sm"
                  />
                  {(clients.length > 0 || searchLoading) && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {searchLoading ? (
                        <div className="px-3 py-2 text-sm text-text-secondary">Searching...</div>
                      ) : (
                        clients.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => handleSelectClient(c)}
                            className="w-full text-left px-3 py-2 hover:bg-background-secondary text-sm"
                          >
                            <span className="font-medium text-text-primary">{c.name}</span>
                            <span className="text-text-secondary ml-2">{c.email}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Package (SESSION type with client) */}
        {type === 'SESSION' && selectedClient && (
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Package</label>
            {clientPackages.length > 0 ? (
              <select
                value={selectedPackageId}
                onChange={(e) => setSelectedPackageId(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-background-primary text-text-primary text-sm"
              >
                <option value="">No package</option>
                {clientPackages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.remainingSessions} sessions left)
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-text-secondary">No active packages for this client</p>
            )}
          </div>
        )}

        {/* Duration */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">Duration</label>
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full max-w-[200px] px-3 py-2 border border-border rounded-md bg-background-primary text-text-primary text-sm"
          >
            {DURATION_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {d} min
              </option>
            ))}
          </select>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-border rounded-md bg-background-primary text-text-primary text-sm resize-none"
            placeholder="Any notes for this appointment..."
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? 'Creating...' : 'Create Appointment'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
