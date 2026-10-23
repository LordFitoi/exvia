'use client'

import { useEffect, useState } from 'react'

import { searchCategory, searchPlaces } from '@/services/placeSearchApi'
import type { Coordinates } from '@/types/geolocation'
import type { PlaceSuggestion } from '@/types/place'

const DEBOUNCE_MS = 300
const MIN_QUERY_LENGTH = 2
const NO_SUGGESTIONS: readonly PlaceSuggestion[] = []

/** `idle` when there is nothing to look up yet; `searching` until the first answer; `failed` when no service answered. */
export type SuggestionStatus = 'idle' | 'searching' | 'ready' | 'failed'

interface PlaceSuggestionsOptions {
  accessToken: string | undefined
  query: string
  /** When set, the nearest places of this kind are listed instead of what the query matches. */
  categoryId: string | null
  /** Places are ordered by distance from this spot. */
  proximity: Coordinates
  /** Changing it asks again for the same text, as a rider does to retry after a failure. */
  attempt: number
}

export interface PlaceSuggestions {
  readonly suggestions: readonly PlaceSuggestion[]
  readonly status: SuggestionStatus
}

interface SuggestionRequest {
  readonly accessToken: string
  readonly text: string
  readonly categoryId: string | null
  readonly proximity: Coordinates
}

interface FoundSuggestions {
  /** What was asked, to tell its answer from the answer to an earlier text. */
  readonly searchKey: string
  readonly categoryId: string | null
  readonly suggestions: readonly PlaceSuggestion[]
  readonly hasFailed: boolean
}

const NOTHING_FOUND: FoundSuggestions = { searchKey: '', categoryId: null, suggestions: NO_SUGGESTIONS, hasFailed: false }

const getSearchKey = (categoryId: string | null, text: string): string =>
  categoryId ? `category:${categoryId}` : `text:${text}`

/** Hands over each answer as it grows (the places first, then the same completed) until the search ends or is replaced. */
const loadSuggestions = async (
  { accessToken, text, categoryId, proximity }: SuggestionRequest,
  signal: AbortSignal,
  onFound: (found: FoundSuggestions) => void,
): Promise<void> => {
  const searchKey = getSearchKey(categoryId, text)
  try {
    const options = { signal, proximity }
    const answers = categoryId ? searchCategory(categoryId, options) : searchPlaces(text, { ...options, accessToken })
    for await (const suggestions of answers) {
      if (signal.aborted) return
      onFound({ searchKey, categoryId, suggestions, hasFailed: false })
    }
  } catch (error) {
    if (signal.aborted) return
    console.error('Could not search places', error)
    onFound({ searchKey, categoryId, suggestions: NO_SUGGESTIONS, hasFailed: true })
  }
}

const describeStatus = (found: FoundSuggestions, searchKey: string): SuggestionStatus => {
  if (found.searchKey !== searchKey) return 'searching'
  return found.hasFailed ? 'failed' : 'ready'
}

/**
 * What matches the text being typed, looked up once typing pauses, or the places of a picked
 * category. The answer to an earlier query keeps showing while the next one loads, but the answers
 * of a category and of a query never mix. The status tells the field what to say when there is
 * nothing to list: that it is searching, that nothing matches, or that the search failed.
 */
export const usePlaceSuggestions = ({
  accessToken,
  query,
  categoryId,
  proximity,
  attempt,
}: PlaceSuggestionsOptions): PlaceSuggestions => {
  const [found, setFound] = useState<FoundSuggestions>(NOTHING_FOUND)
  const text = query.trim()
  const { longitude, latitude } = proximity
  const isSearchable = Boolean(accessToken) && (categoryId !== null || text.length >= MIN_QUERY_LENGTH)

  useEffect(() => {
    if (!accessToken || !isSearchable) return
    const controller = new AbortController()
    const request = { accessToken, text, categoryId, proximity: { longitude, latitude } }
    const timer = setTimeout(() => loadSuggestions(request, controller.signal, setFound), categoryId ? 0 : DEBOUNCE_MS)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [accessToken, isSearchable, categoryId, text, longitude, latitude, attempt])

  if (!isSearchable) return { suggestions: NO_SUGGESTIONS, status: 'idle' }
  if (found.categoryId !== categoryId) return { suggestions: NO_SUGGESTIONS, status: 'searching' }
  return { suggestions: found.suggestions, status: describeStatus(found, getSearchKey(categoryId, text)) }
}
