/**
 * CSV column mapping utilities for the smart import wizard.
 * Handles header detection, synonym matching, and CSV remapping.
 */

import { findBestMatch, normalizeString } from './fuzzy-match'

// FitSync expected column names
export const FITSYNC_FIELDS = {
  required: ['Name', 'Email', 'Location', 'Trainer Email', 'Package Name', 'Remaining Sessions'] as const,
  optional: ['Phone', 'Total Sessions', 'Expiry Date'] as const,
}

export type FitSyncField = typeof FITSYNC_FIELDS.required[number] | typeof FITSYNC_FIELDS.optional[number]

const ALL_FIELDS: FitSyncField[] = [...FITSYNC_FIELDS.required, ...FITSYNC_FIELDS.optional]

// Synonym dictionary: FitSync field -> known CSV header variants (lowercase)
const FIELD_SYNONYMS: Record<FitSyncField, string[]> = {
  'Name': ['name', 'client name', 'customer name', 'full name', 'member name', 'member', 'client'],
  'Email': ['email', 'email address', 'client email', 'e-mail', 'member email'],
  'Phone': ['phone', 'mobile', 'phone number', 'cell', 'contact', 'mobile number', 'tel'],
  'Location': ['location', 'gym', 'branch', 'club', 'site', 'gym location', 'studio'],
  'Trainer Email': ['trainer', 'trainer email', 'pt', 'pt email', 'coach', 'coach email', 'trainer name'],
  'Package Name': ['package', 'package name', 'membership', 'plan', 'product', 'service', 'package type'],
  'Remaining Sessions': ['remaining', 'sessions left', 'sessions remaining', 'balance', 'remaining sessions'],
  'Total Sessions': ['total', 'total sessions', 'sessions', 'session count'],
  'Expiry Date': ['expiry', 'expiry date', 'end date', 'expires', 'valid until', 'expiration', 'exp date'],
}

export type MatchConfidence = 'exact' | 'synonym' | 'none'

export interface HeaderMatch {
  field: FitSyncField | null
  confidence: MatchConfidence
}

/**
 * Detect which FitSync field each CSV header likely maps to.
 */
export function detectHeaderMatches(csvHeaders: string[]): Record<string, HeaderMatch> {
  const results: Record<string, HeaderMatch> = {}
  const usedFields = new Set<FitSyncField>()

  // First pass: exact matches (case-insensitive)
  for (const header of csvHeaders) {
    const lower = header.toLowerCase().trim()
    const exactMatch = ALL_FIELDS.find(f => f.toLowerCase() === lower)
    if (exactMatch && !usedFields.has(exactMatch)) {
      results[header] = { field: exactMatch, confidence: 'exact' }
      usedFields.add(exactMatch)
    }
  }

  // Second pass: synonym matches for unmatched headers
  for (const header of csvHeaders) {
    if (results[header]) continue

    const lower = header.toLowerCase().trim()
    let bestField: FitSyncField | null = null

    for (const [field, synonyms] of Object.entries(FIELD_SYNONYMS)) {
      if (usedFields.has(field as FitSyncField)) continue
      if (synonyms.includes(lower)) {
        bestField = field as FitSyncField
        break
      }
    }

    if (bestField) {
      results[header] = { field: bestField, confidence: 'synonym' }
      usedFields.add(bestField)
    } else {
      results[header] = { field: null, confidence: 'none' }
    }
  }

  return results
}

/**
 * Check if all required FitSync fields are present in a mapping.
 * The mapping is { csvHeader: fitSyncField | 'skip' }
 */
export function allRequiredFieldsMapped(mapping: Record<string, string>): {
  satisfied: boolean
  missing: string[]
} {
  const mappedFields = new Set(Object.values(mapping))
  const missing = FITSYNC_FIELDS.required.filter(f => !mappedFields.has(f))
  return { satisfied: missing.length === 0, missing }
}

/**
 * Find FitSync fields that are mapped more than once.
 */
export function hasDuplicateMappings(mapping: Record<string, string>): string[] {
  const fieldCounts: Record<string, number> = {}
  for (const field of Object.values(mapping)) {
    if (field === 'skip') continue
    fieldCounts[field] = (fieldCounts[field] || 0) + 1
  }
  return Object.entries(fieldCounts)
    .filter(([_, count]) => count > 1)
    .map(([field]) => field)
}

/**
 * Parse CSV text into lines, handling quoted fields with commas/newlines.
 */
export function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  fields.push(current.trim())
  return fields
}

/**
 * Parse CSV text to extract headers and preview rows.
 */
export function parseCsvPreview(csvText: string): {
  headers: string[]
  previewRows: string[][]
} {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim() !== '')
  if (lines.length === 0) return { headers: [], previewRows: [] }

  const headers = parseCsvLine(lines[0])
  const previewRows = lines.slice(1, 4).map(parseCsvLine)

  return { headers, previewRows }
}

/**
 * Rewrite CSV header row using a mapping, drop skipped columns.
 * Returns new CSV text with FitSync-expected headers.
 */
export function remapCsvHeaders(csvText: string, mapping: Record<string, string>): string {
  const lines = csvText.split(/\r?\n/)
  if (lines.length === 0) return csvText

  const originalHeaders = parseCsvLine(lines[0])

  // Build column index map: which original columns to keep and what to rename them to
  const columnMap: Array<{ originalIndex: number; newName: string }> = []
  originalHeaders.forEach((header, index) => {
    const mapped = mapping[header]
    if (mapped && mapped !== 'skip') {
      columnMap.push({ originalIndex: index, newName: mapped })
    }
  })

  // Rebuild CSV
  const newLines: string[] = []

  // New header row
  newLines.push(columnMap.map(c => c.newName).join(','))

  // Data rows
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '') continue
    const fields = parseCsvLine(lines[i])
    const newFields = columnMap.map(c => {
      const val = fields[c.originalIndex] || ''
      // Re-quote if contains comma
      return val.includes(',') ? `"${val}"` : val
    })
    newLines.push(newFields.join(','))
  }

  return newLines.join('\n')
}

/**
 * Rewrite Package Name column values using a name map.
 * Used when user maps an unmatched CSV package name to an existing package type.
 */
export function remapPackageNames(csvText: string, nameMap: Record<string, string>): string {
  if (Object.keys(nameMap).length === 0) return csvText

  const lines = csvText.split(/\r?\n/)
  if (lines.length === 0) return csvText

  const headers = parseCsvLine(lines[0])
  const packageNameIndex = headers.findIndex(h => h.toLowerCase() === 'package name')
  if (packageNameIndex === -1) return csvText

  const newLines = [lines[0]]
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '') continue
    const fields = parseCsvLine(lines[i])
    const originalName = fields[packageNameIndex]
    if (originalName && nameMap[originalName]) {
      fields[packageNameIndex] = nameMap[originalName]
    }
    const rebuilt = fields.map(f => f.includes(',') ? `"${f}"` : f).join(',')
    newLines.push(rebuilt)
  }

  return newLines.join('\n')
}

/**
 * Extract unique package names from CSV text (after column mapping).
 */
export function extractPackageNames(csvText: string): Map<string, number> {
  const lines = csvText.split(/\r?\n/)
  if (lines.length < 2) return new Map()

  const headers = parseCsvLine(lines[0])
  const packageNameIndex = headers.findIndex(h => h.toLowerCase() === 'package name')
  if (packageNameIndex === -1) return new Map()

  const counts = new Map<string, number>()
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '') continue
    const fields = parseCsvLine(lines[i])
    const name = fields[packageNameIndex]?.trim()
    if (name) {
      counts.set(name, (counts.get(name) || 0) + 1)
    }
  }

  return counts
}

/**
 * Infer session count from a package name (e.g., "24 PT Sessions" → 24).
 */
export function inferSessionCount(packageName: string): number | null {
  const match = packageName.match(/(\d+)/)
  if (match) {
    const num = parseInt(match[1])
    if (num > 0 && num <= 500) return num
  }
  return null
}

export interface MatchedPackage {
  csvName: string
  packageType: { id: string; name: string }
  clientCount: number
  matchType: 'exact' | 'fuzzy'
}

export interface UnmatchedPackage {
  csvName: string
  clientCount: number
  suggestedSessions: number | null
  suggestedMatch: { id: string; name: string } | null
}

/**
 * Analyze CSV package names against existing package types.
 */
export function analyzePackageNames(
  packageNameCounts: Map<string, number>,
  existingPackageTypes: Array<{ id: string; name: string }>
): {
  matched: MatchedPackage[]
  unmatched: UnmatchedPackage[]
} {
  const matched: MatchedPackage[] = []
  const unmatched: UnmatchedPackage[] = []
  const typeNames = existingPackageTypes.map(t => t.name)

  for (const [csvName, count] of packageNameCounts) {
    // Exact match (case-insensitive)
    const exactMatch = existingPackageTypes.find(
      t => normalizeString(t.name) === normalizeString(csvName)
    )
    if (exactMatch) {
      matched.push({
        csvName,
        packageType: { id: exactMatch.id, name: exactMatch.name },
        clientCount: count,
        matchType: 'exact',
      })
      continue
    }

    // Fuzzy match
    const fuzzyResult = findBestMatch(csvName, typeNames, 0.6)
    if (fuzzyResult && fuzzyResult.score >= 0.8) {
      const fuzzyType = existingPackageTypes.find(t => t.name === fuzzyResult.match)!
      matched.push({
        csvName,
        packageType: { id: fuzzyType.id, name: fuzzyType.name },
        clientCount: count,
        matchType: 'fuzzy',
      })
    } else {
      const suggestedMatch = fuzzyResult && fuzzyResult.score >= 0.5
        ? existingPackageTypes.find(t => t.name === fuzzyResult.match) || null
        : null

      unmatched.push({
        csvName,
        clientCount: count,
        suggestedSessions: inferSessionCount(csvName),
        suggestedMatch: suggestedMatch ? { id: suggestedMatch.id, name: suggestedMatch.name } : null,
      })
    }
  }

  return { matched, unmatched }
}
