'use client'

import { useEffect, useCallback } from 'react'

interface FilterData {
  clientIds: string[]
  trainerIds: string[]
  locationIds: string[]
  validatedStatuses: string[]
  startDate: string
  endDate: string
}

interface FilterState {
  filters: FilterData
  isOpen: boolean
}

export function useFilterPersistence(storageKey: string) {
  // Save filter state to sessionStorage
  const saveFilters = useCallback((filters: FilterData, isOpen: boolean) => {
    if (typeof window === 'undefined') return
    
    const state: FilterState = {
      filters,
      isOpen
    }
    
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(state))
    } catch (error) {
      console.warn('Failed to save filter state:', error)
    }
  }, [storageKey])

  // Load filter state from sessionStorage
  const loadFilters = useCallback((): FilterState | null => {
    if (typeof window === 'undefined') return null
    
    try {
      const stored = sessionStorage.getItem(storageKey)
      if (stored) {
        return JSON.parse(stored)
      }
    } catch (error) {
      console.warn('Failed to load filter state:', error)
    }
    
    return null
  }, [storageKey])

  // Clear filter state from sessionStorage
  const clearFilters = useCallback(() => {
    if (typeof window === 'undefined') return
    
    try {
      sessionStorage.removeItem(storageKey)
    } catch (error) {
      console.warn('Failed to clear filter state:', error)
    }
  }, [storageKey])

  // Sync URL params with sessionStorage on mount
  const syncWithUrl = useCallback((urlFilters: FilterData) => {
    const stored = loadFilters()
    
    // If URL has filters, they take priority (user might have shared a link)
    const hasUrlFilters = Object.values(urlFilters).some(value => 
      Array.isArray(value) ? value.length > 0 : !!value
    )
    
    if (hasUrlFilters) {
      // URL has filters, update storage to match
      saveFilters(urlFilters, stored?.isOpen ?? false)
      return { filters: urlFilters, isOpen: stored?.isOpen ?? false }
    } else if (stored) {
      // No URL filters but we have stored filters, use them
      return stored
    }
    
    // No filters anywhere, return defaults
    return null
  }, [loadFilters, saveFilters])

  return {
    saveFilters,
    loadFilters,
    clearFilters,
    syncWithUrl
  }
}