/**
 * Generic fuzzy string matching utilities.
 * Used for location matching, package name matching, etc.
 */

export function normalizeString(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        )
      }
    }
  }

  return matrix[b.length][a.length]
}

export interface FuzzyMatchResult {
  match: string
  score: number
}

/**
 * Find the best matching string from a list of candidates.
 * Returns null if no match meets the minimum threshold.
 *
 * Scoring:
 * - 1.0: exact match (after normalization)
 * - 0.7: one string contains the other
 * - 0.3-0.6: based on Levenshtein distance (shorter distance = higher score)
 */
export function findBestMatch(
  input: string,
  candidates: string[],
  minScore = 0.4
): FuzzyMatchResult | null {
  if (!input || candidates.length === 0) return null

  const normalizedInput = normalizeString(input)
  let bestMatch: FuzzyMatchResult | null = null

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeString(candidate)

    // Exact normalized match
    if (normalizedInput === normalizedCandidate) {
      return { match: candidate, score: 1.0 }
    }

    // One contains the other
    if (normalizedInput.includes(normalizedCandidate) || normalizedCandidate.includes(normalizedInput)) {
      const score = 0.7
      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { match: candidate, score }
      }
      continue
    }

    // Levenshtein distance
    const distance = levenshteinDistance(normalizedInput, normalizedCandidate)
    const maxLen = Math.max(normalizedInput.length, normalizedCandidate.length)
    if (maxLen === 0) continue

    const score = 1 - distance / maxLen
    if (score >= minScore && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { match: candidate, score }
    }
  }

  return bestMatch
}
