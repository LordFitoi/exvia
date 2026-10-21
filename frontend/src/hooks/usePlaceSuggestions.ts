'use client'

import { useEffect, useState } from 'react'

import { searchCategory, searchPlaces } from '@/services/placeSearchApi'
import type { Coordinates } from '@/types/geolocation'
import type { PlaceSuggestion } from '@/types/place'

const DEBOUNCE_MS = 300
const MIN_QUERY_LENGTH = 3
const NO_SUGGESTIONS: readonly PlaceSuggestion[] = []

interface PlaceSuggestionsOptions {
  accessToken: string | undefined
  query: string
  /** When set, the nearest places of this kind are listed instead of what the query matches. */
  categoryId: string | null
  /** Places are ordered by distance from this spot. */
  proximity: Coordinates
}

interface FoundSuggestions {
  readonly categoryId: string | null
  readonly suggestions: readonly PlaceSuggestion[]
}

/**
 * What matches the text being typed, looked up once typing pauses, or the places of a picked
 * category. The answer to an earlier query keeps showing while the next one loads, but the answers
 * of a category and of a query never mix. A failed lookup leaves the suggestions as they were: they
 * are only a help, and the rider can still tap the map.
 */
export const usePlaceSuggestions = ({
  accessToken,
  query,
  categoryId,
  proximity,
}: PlaceSuggestionsOptions): readonly PlaceSuggestion[] => {
  const [found, setFound] = useState<FoundSuggestions>({ categoryId: null, suggestions: NO_SUGGESTIONS })
  const text = query.trim()
  const { longitude, latitude } = proximity
  const isSearchable = Boolean(accessToken) && (categoryId !== null || text.length >= MIN_QUERY_LENGTH)

  useEffect(() => {
    if (!accessToken || !isSearchable) return
    const controller = new AbortController()
    const { signal } = controller
    const options = { signal, proximity: { longitude, latitude } }
    const load = async () => {
      try {
        const suggestions = categoryId
          ? await searchCategory(categoryId, options)
          : await searchPlaces(text, { ...options, accessToken })
        if (!signal.aborted) setFound({ categoryId, suggestions })
      } catch (error) {
        if (!signal.aborted) console.error('Could not search places', error)
      }
    }
    const timer = setTimeout(load, categoryId ? 0 : DEBOUNCE_MS)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [accessToken, isSearchable, categoryId, text, longitude, latitude])

  if (!isSearchable || found.categoryId !== categoryId) return NO_SUGGESTIONS
  return found.suggestions
}
