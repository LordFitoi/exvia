'use client'

import { useEffect, useState } from 'react'

import { searchRiders } from '@/services/riderSearchApi'
import type { RiderProfile } from '@/types/routeGroup'

const DEBOUNCE_MS = 200

/**
 * The riders whose username starts with what is being typed, looked up once typing pauses.
 * Answers of an earlier, shorter prefix still show while the next one loads, but only the riders
 * that match what is typed now. A failed lookup leaves the suggestions as they were: they are only
 * a help, and sending the form still checks the name.
 */
export const useRiderSuggestions = (query: string): readonly RiderProfile[] => {
  const [found, setFound] = useState<readonly RiderProfile[]>([])
  const prefix = query.trim().toLowerCase()

  useEffect(() => {
    if (!prefix) return
    let isCancelled = false
    const timer = setTimeout(async () => {
      try {
        const riders = await searchRiders(prefix)
        if (!isCancelled) setFound(riders)
      } catch (error) {
        console.error('Could not load rider suggestions', error)
      }
    }, DEBOUNCE_MS)
    return () => {
      isCancelled = true
      clearTimeout(timer)
    }
  }, [prefix])

  if (!prefix) return []
  return found.filter(({ username }) => username.toLowerCase().startsWith(prefix))
}
