'use client'

import { useCallback, useState } from 'react'

import { usePlaceSuggestions } from '@/hooks/usePlaceSuggestions'
import { NO_ACTIVE_OPTION, stepActiveOption } from '@/services/suggestionCursor'
import type { Coordinates } from '@/types/geolocation'
import type { Place, PlaceSuggestion } from '@/types/place'

interface PlaceCompletionOptions {
  accessToken: string | undefined
  proximity: Coordinates
  onSelect: (place: Place) => void
}

export interface PlaceCompletion {
  readonly value: string
  readonly suggestions: readonly PlaceSuggestion[]
  /** Whether the list is showing: it is open and has rows to offer. */
  readonly isVisible: boolean
  /** The row that the arrow keys are on. */
  readonly activeSuggestion: PlaceSuggestion | undefined
  /** The text typed: opens the list again for the new text. */
  change: (text: string) => void
  /** A category lists its places; a place is handed over and the field is cleared for the next search. */
  pick: (suggestion: PlaceSuggestion) => void
  /** Moves the active row down (1) or up (-1) the list. */
  move: (step: number) => void
  close: () => void
}

/** The state of the place search: what is typed, the category being browsed, and which row is active. */
export const usePlaceCompletion = ({
  accessToken,
  proximity,
  onSelect,
}: PlaceCompletionOptions): PlaceCompletion => {
  const [value, setValue] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(NO_ACTIVE_OPTION)
  const suggestions = usePlaceSuggestions({ accessToken, query: value, categoryId, proximity })
  const isVisible = isOpen && suggestions.length > 0
  const close = useCallback(() => setIsOpen(false), [])

  const change = (text: string) => {
    setValue(text)
    setCategoryId(null)
    setActiveIndex(NO_ACTIVE_OPTION)
    setIsOpen(true)
  }

  const pick = (suggestion: PlaceSuggestion) => {
    setActiveIndex(NO_ACTIVE_OPTION)
    if (suggestion.kind === 'category') {
      setValue(suggestion.title)
      return setCategoryId(suggestion.id)
    }
    setValue('')
    setCategoryId(null)
    setIsOpen(false)
    onSelect(suggestion.place)
  }

  const move = (step: number) => setActiveIndex(stepActiveOption(activeIndex, step, suggestions.length))

  return { value, suggestions, isVisible, activeSuggestion: suggestions[activeIndex], change, pick, move, close }
}
