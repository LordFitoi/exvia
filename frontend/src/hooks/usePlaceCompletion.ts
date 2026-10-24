'use client'

import { useCallback, useReducer } from 'react'

import { useFavoritePlaces } from '@/hooks/useFavoritePlaces'
import { usePlaceSuggestions } from '@/hooks/usePlaceSuggestions'
import type { SuggestionStatus } from '@/hooks/usePlaceSuggestions'
import { listCategories } from '@/services/placeCategories'
import { MAX_SUGGESTIONS } from '@/services/placeSearchConfig'
import { findSavedPlaces, putSavedPlacesFirst } from '@/services/savedPlaceSuggestions'
import { NO_ACTIVE_OPTION, stepActiveOption } from '@/services/suggestionCursor'
import type { Coordinates } from '@/types/geolocation'
import type { Place, PlaceSuggestion } from '@/types/place'
import type { PlaceLocation } from '@/types/placeLocation'

// With nothing typed, the kinds of place are offered, so a rider can start without knowing a name.
const KIND_SUGGESTIONS: readonly PlaceSuggestion[] = listCategories()

interface PlaceCompletionOptions {
  accessToken: string | undefined
  proximity: Coordinates
  onSelect: (place: Place, savedPlace?: PlaceLocation) => void
}

export interface PlaceCompletion {
  readonly value: string
  readonly suggestions: readonly PlaceSuggestion[]
  /** What the list has to say when it has no places to offer. */
  readonly status: SuggestionStatus
  /** Whether the list is showing: it is open and has rows or a message to offer. */
  readonly isVisible: boolean
  /** The row that the arrow keys are on. */
  readonly activeSuggestion: PlaceSuggestion | undefined
  /** The text typed: opens the list again for the new text. */
  change: (text: string) => void
  /** A category lists its places; a place is handed over and the field is cleared for the next search. */
  pick: (suggestion: PlaceSuggestion) => void
  /** Moves the active row down (1) or up (-1) the list. */
  move: (step: number) => void
  /** Shows the list, and asks again if the last search failed. */
  open: () => void
  close: () => void
}

interface CompletionState {
  readonly value: string
  /** The category being browsed; null while the text is searched. */
  readonly categoryId: string | null
  readonly isOpen: boolean
  readonly activeIndex: number
  /** Raised to ask again for the same text. */
  readonly attempt: number
}

type CompletionAction =
  | { type: 'typed'; text: string }
  | { type: 'category-picked'; id: string; title: string }
  | { type: 'place-picked' }
  | { type: 'moved'; step: number; count: number }
  | { type: 'opened'; shouldRetry: boolean }
  | { type: 'closed' }

const INITIAL_STATE: CompletionState = { value: '', categoryId: null, isOpen: false, activeIndex: NO_ACTIVE_OPTION, attempt: 0 }

const reduceCompletion = (state: CompletionState, action: CompletionAction): CompletionState => {
  switch (action.type) {
    case 'typed':
      return { ...state, value: action.text, categoryId: null, activeIndex: NO_ACTIVE_OPTION, isOpen: true }
    case 'category-picked':
      return { ...state, value: action.title, categoryId: action.id, activeIndex: NO_ACTIVE_OPTION }
    case 'place-picked':
      return { ...state, value: '', categoryId: null, activeIndex: NO_ACTIVE_OPTION, isOpen: false }
    case 'moved':
      return { ...state, activeIndex: stepActiveOption(state.activeIndex, action.step, action.count) }
    case 'opened':
      return { ...state, isOpen: true, attempt: state.attempt + (action.shouldRetry ? 1 : 0) }
    case 'closed':
      return { ...state, isOpen: false }
  }
}

/** Whether the list has a message to give in place of rows: it is searching, found nothing, or failed. */
const hasMessage = (status: SuggestionStatus, rowCount: number): boolean =>
  status === 'failed' || (status !== 'idle' && rowCount === 0)

interface ListedSuggestions {
  text: string
  categoryId: string | null
  found: readonly PlaceSuggestion[]
  favorites: readonly PlaceLocation[]
  proximity: Coordinates
}

/** The kinds of place with nothing typed; else the places found, with the rider's saved places that match the text first. Never more than 8 rows. */
const listSuggestions = ({ text, categoryId, found, favorites, proximity }: ListedSuggestions): readonly PlaceSuggestion[] => {
  if (text === '') return KIND_SUGGESTIONS.slice(0, MAX_SUGGESTIONS)
  if (categoryId !== null) return found.slice(0, MAX_SUGGESTIONS)
  return putSavedPlacesFirst(findSavedPlaces(text, favorites, proximity), found).slice(0, MAX_SUGGESTIONS)
}

/** The state of the place search: what is typed, the category being browsed, and which row is active. */
export const usePlaceCompletion = ({ accessToken, proximity, onSelect }: PlaceCompletionOptions): PlaceCompletion => {
  const [state, dispatch] = useReducer(reduceCompletion, INITIAL_STATE)
  const { value, categoryId, isOpen, activeIndex, attempt } = state
  const found = usePlaceSuggestions({ accessToken, query: value, categoryId, proximity, attempt })
  const favorites = useFavoritePlaces(isOpen)
  const suggestions = listSuggestions({ text: value.trim(), categoryId, found: found.suggestions, favorites, proximity })
  const isVisible = isOpen && (suggestions.length > 0 || hasMessage(found.status, suggestions.length))
  const close = useCallback(() => dispatch({ type: 'closed' }), [])

  const pick = (suggestion: PlaceSuggestion) => {
    if (suggestion.kind === 'category') return dispatch({ type: 'category-picked', id: suggestion.id, title: suggestion.title })
    dispatch({ type: 'place-picked' })
    onSelect(suggestion.place, suggestion.kind === 'saved' ? suggestion.saved : undefined)
  }

  const move = (step: number) => {
    if (suggestions.length > 0) dispatch({ type: 'moved', step, count: suggestions.length })
  }

  return {
    value,
    suggestions,
    status: found.status,
    isVisible,
    activeSuggestion: suggestions[activeIndex],
    change: (text) => dispatch({ type: 'typed', text }),
    pick,
    move,
    open: () => dispatch({ type: 'opened', shouldRetry: found.status === 'failed' }),
    close,
  }
}
