'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import {
  CheckCircle,
  AlertTriangle,
  Minus,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react'
import {
  type FitSyncField,
  type HeaderMatch,
  FITSYNC_FIELDS,
  allRequiredFieldsMapped,
  hasDuplicateMappings,
} from '@/lib/csv-column-mapping'

const ALL_FIELDS: FitSyncField[] = [
  ...FITSYNC_FIELDS.required,
  ...FITSYNC_FIELDS.optional,
]

interface ColumnMapperProps {
  csvHeaders: string[]
  suggestedMappings: Record<string, HeaderMatch>
  previewRows: string[][]
  onConfirm: (mapping: Record<string, string>) => void
  onBack: () => void
}

export function ColumnMapper({
  csvHeaders,
  suggestedMappings,
  previewRows,
  onConfirm,
  onBack,
}: ColumnMapperProps) {
  // Initialize mapping: empty for all columns (user must confirm)
  const [mapping, setMapping] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    for (const header of csvHeaders) {
      initial[header] = ''
    }
    return initial
  })

  const updateMapping = (csvHeader: string, fitSyncField: string) => {
    setMapping(prev => ({ ...prev, [csvHeader]: fitSyncField }))
  }

  const { satisfied, missing } = useMemo(
    () => allRequiredFieldsMapped(mapping),
    [mapping]
  )

  const duplicates = useMemo(
    () => hasDuplicateMappings(mapping),
    [mapping]
  )

  const canContinue = satisfied && duplicates.length === 0

  // Build set of currently used fields to show in dropdowns
  const usedFields = useMemo(() => {
    const used = new Set<string>()
    for (const val of Object.values(mapping)) {
      if (val && val !== 'skip') used.add(val)
    }
    return used
  }, [mapping])

  const getRowIcon = (csvHeader: string) => {
    const value = mapping[csvHeader]
    if (!value) {
      // Check if this header has a suggestion
      const suggestion = suggestedMappings[csvHeader]
      if (suggestion?.field && FITSYNC_FIELDS.required.includes(suggestion.field as typeof FITSYNC_FIELDS.required[number])) {
        return <AlertTriangle className="h-4 w-4 text-warning-500" />
      }
      return <Minus className="h-4 w-4 text-text-tertiary" />
    }
    if (value === 'skip') {
      return <Minus className="h-4 w-4 text-text-tertiary" />
    }
    const isRequired = FITSYNC_FIELDS.required.includes(value as typeof FITSYNC_FIELDS.required[number])
    if (isRequired) {
      return <CheckCircle className="h-4 w-4 text-success-600" />
    }
    return <CheckCircle className="h-4 w-4 text-primary-500" />
  }

  // Preview: show first 3 data rows with mapped column names
  const mappedPreviewHeaders = csvHeaders
    .filter(h => mapping[h] && mapping[h] !== 'skip')
    .map(h => mapping[h])

  const mappedPreviewRows = previewRows.map(row =>
    csvHeaders
      .map((h, i) => ({ field: mapping[h], value: row[i] || '' }))
      .filter(item => item.field && item.field !== 'skip')
      .map(item => item.value)
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Map Your Columns</CardTitle>
        <p className="text-sm text-text-secondary mt-1">
          We detected these columns in your file. Please map them to the corresponding FitSync fields.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Mapping Table */}
        <div className="space-y-3">
          {csvHeaders.map((header, headerIndex) => {
            const suggestion = suggestedMappings[header]
            const currentValue = mapping[header]
            const isDuplicate = currentValue && currentValue !== 'skip' && duplicates.includes(currentValue)

            // Get sample values from preview rows for this column
            const sampleValues = previewRows
              .map(row => row[headerIndex] || '')
              .filter(v => v.trim() !== '')
              .slice(0, 3)

            return (
              <div
                key={header}
                className={`p-3 rounded-lg border ${
                  isDuplicate ? 'border-error-300 bg-error-50' : 'border-border bg-surface'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Status icon */}
                  <div className="flex-shrink-0">{getRowIcon(header)}</div>

                  {/* CSV column name */}
                  <div className="flex-1 min-w-0">
                    <code className="text-sm font-mono bg-background-secondary px-2 py-1 rounded">
                      {header}
                    </code>
                  </div>

                  {/* Arrow */}
                  <ArrowRight className="h-4 w-4 text-text-tertiary flex-shrink-0" />

                  {/* FitSync field dropdown */}
                  <div className="flex-1 min-w-0">
                    <select
                      className={`w-full text-sm border rounded-lg px-3 py-2 bg-white focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                        isDuplicate ? 'border-error-400' : 'border-border'
                      }`}
                      value={currentValue}
                      onChange={e => updateMapping(header, e.target.value)}
                    >
                      <option value="">-- Select field --</option>
                      <option value="skip">-- Skip this column --</option>
                      {ALL_FIELDS.map(field => {
                        const isUsed = usedFields.has(field) && currentValue !== field
                        return (
                          <option key={field} value={field} disabled={isUsed}>
                            {field}{FITSYNC_FIELDS.required.includes(field as typeof FITSYNC_FIELDS.required[number]) ? ' *' : ''}
                            {isUsed ? ' (already mapped)' : ''}
                          </option>
                        )
                      })}
                    </select>
                    {/* Show suggestion hint */}
                    {suggestion?.confidence === 'synonym' && !currentValue && (
                      <p className="text-xs text-primary-600 mt-1">
                        Suggested: {suggestion.field}
                      </p>
                    )}
                    {isDuplicate && (
                      <p className="text-xs text-error-600 mt-1">
                        This field is already mapped to another column
                      </p>
                    )}
                  </div>
                </div>

                {/* Sample data preview */}
                {sampleValues.length > 0 && (
                  <div className="mt-2 ml-8 text-xs text-text-tertiary">
                    <span className="text-text-secondary">e.g.</span>{' '}
                    {sampleValues.join(', ')}
                    {previewRows.length > sampleValues.length && ', ...'}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Validation messages */}
        {missing.length > 0 && (
          <div className="p-3 bg-warning-50 border border-warning-200 rounded-lg">
            <p className="text-sm font-medium text-warning-800">
              Required fields not yet mapped:
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {missing.map(field => (
                <Badge key={field} variant="warning" size="sm">
                  {field}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Preview */}
        {mappedPreviewHeaders.length > 0 && mappedPreviewRows.length > 0 && (
          <div>
            <p className="text-sm font-medium text-text-primary mb-2">Preview (first {mappedPreviewRows.length} rows)</p>
            <div className="overflow-x-auto border border-border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-background-secondary">
                  <tr>
                    {mappedPreviewHeaders.map((h, i) => (
                      <th key={i} className="px-3 py-2 text-left text-xs font-medium text-text-secondary">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {mappedPreviewRows.map((row, i) => (
                    <tr key={i}>
                      {row.map((cell, j) => (
                        <td key={j} className="px-3 py-2 text-text-primary whitespace-nowrap">
                          {cell || <span className="text-text-tertiary italic">empty</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button
            onClick={() => onConfirm(mapping)}
            disabled={!canContinue}
          >
            Continue
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
