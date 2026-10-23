'use client'

import type { KeyboardEvent, RefObject } from 'react'

import type { PlaceCompletion } from '@/hooks/usePlaceCompletion'
import { getOptionId } from '@/views/routes/PlaceSuggestionList'

const KEY_STEPS: Readonly<Record<string, number>> = { ArrowDown: 1, ArrowUp: -1 }

interface PlaceSearchInputProps {
  inputRef: RefObject<HTMLInputElement | null>
  listId: string
  /** What the field is for, for screen readers: the visible placeholder only names what can be typed. */
  label: string
  completion: PlaceCompletion
}

/**
 * Arrow keys move through the open list, Enter picks the active row (the first one if none is active).
 * While the places for the text typed are on their way, the rows still showing belong to the text
 * before, so Enter waits for the new ones instead of picking one of those.
 */
const handlePlaceKey = (event: KeyboardEvent<HTMLInputElement>, completion: PlaceCompletion) => {
  if (!completion.isVisible) return
  const step = KEY_STEPS[event.key]
  if (step !== undefined) {
    event.preventDefault()
    completion.move(step)
  } else if (event.key === 'Enter') {
    event.preventDefault()
    const target = completion.activeSuggestion ?? completion.suggestions[0]
    if (target && completion.status !== 'searching') completion.pick(target)
  } else if (event.key === 'Escape') {
    event.preventDefault()
    completion.close()
  }
}

/** The text field of the place search, the input of a WAI-ARIA combobox whose options are the suggestion list. */
export default function PlaceSearchInput({ inputRef, listId, label, completion }: PlaceSearchInputProps) {
  const { activeSuggestion } = completion

  return (
    <input
      ref={inputRef}
      className="input input-search"
      type="search"
      role="combobox"
      aria-label={label}
      placeholder="Place, address, category or coordinates"
      aria-expanded={completion.isVisible}
      aria-controls={listId}
      aria-autocomplete="list"
      aria-busy={completion.status === 'searching'}
      aria-activedescendant={activeSuggestion ? getOptionId(listId, activeSuggestion) : undefined}
      autoComplete="off"
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      value={completion.value}
      onChange={(event) => completion.change(event.target.value)}
      onKeyDown={(event) => handlePlaceKey(event, completion)}
      onFocus={completion.open}
      onBlur={completion.close}
    />
  )
}
