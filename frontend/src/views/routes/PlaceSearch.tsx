'use client'

import { useId } from 'react'
import type { KeyboardEvent } from 'react'

import { usePlaceCompletion } from '@/hooks/usePlaceCompletion'
import type { PlaceCompletion } from '@/hooks/usePlaceCompletion'
import { useSuggestionPopover } from '@/hooks/useSuggestionPopover'
import { MAPBOX_ACCESS_TOKEN } from '@/services/mapboxConfig'
import type { Coordinates } from '@/types/geolocation'
import type { Place, PlaceSuggestion } from '@/types/place'

const KEY_STEPS: Readonly<Record<string, number>> = { ArrowDown: 1, ArrowUp: -1 }
const METERS_PER_KILOMETER = 1000
const CATEGORY_HINT = 'Category · nearest first'

interface PlaceSearchProps {
  /** Places near this spot are offered first. */
  proximity: Coordinates
  /** What the field is for, for screen readers: the visible placeholder only names what can be typed. */
  label: string
  onSelect: (place: Place) => void
}

const getOptionId = (listId: string, { kind, id }: PlaceSuggestion): string => `${listId}-${kind}-${id}`

const formatDistance = (meters: number): string =>
  meters < METERS_PER_KILOMETER
    ? `${Math.round(meters)} m`
    : `${(meters / METERS_PER_KILOMETER).toFixed(1)} km`

const describeSuggestion = (suggestion: PlaceSuggestion): string => {
  if (suggestion.kind === 'category') return CATEGORY_HINT
  return [suggestion.address, formatDistance(suggestion.distanceMeters)].filter(Boolean).join(' · ')
}

/** Arrow keys move through the open list, Enter picks the active row (the first one if none is active). */
const handlePlaceKey = (event: KeyboardEvent<HTMLInputElement>, completion: PlaceCompletion) => {
  if (!completion.isVisible) return
  const step = KEY_STEPS[event.key]
  if (step !== undefined) {
    event.preventDefault()
    completion.move(step)
  } else if (event.key === 'Enter') {
    event.preventDefault()
    completion.pick(completion.activeSuggestion ?? completion.suggestions[0])
  } else if (event.key === 'Escape') {
    event.preventDefault()
    completion.close()
  }
}

/**
 * The search field over the map: places, addresses and categories (gas stations, restaurants) that
 * match what is typed are offered under it (WAI-ARIA combobox). Picking a category lists its places.
 */
export default function PlaceSearch({ proximity, label, onSelect }: PlaceSearchProps) {
  const listId = useId()
  const completion = usePlaceCompletion({ accessToken: MAPBOX_ACCESS_TOKEN, proximity, onSelect })
  const { activeSuggestion } = completion
  const { inputRef, listRef } = useSuggestionPopover(completion.isVisible, completion.close)

  return (
    <div className="input-group map-search">
      <span className="icon icon-search" aria-hidden="true"></span>
      <input
        ref={inputRef}
        className="input input-search"
        type="search"
        role="combobox"
        aria-label={label}
        placeholder="Address, place or category"
        aria-expanded={completion.isVisible}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeSuggestion ? getOptionId(listId, activeSuggestion) : undefined}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        value={completion.value}
        onChange={(event) => completion.change(event.target.value)}
        onKeyDown={(event) => handlePlaceKey(event, completion)}
        onBlur={completion.close}
      />
      <ul
        ref={listRef}
        id={listId}
        className="suggestion-list"
        role="listbox"
        aria-label="Place suggestions"
        popover="manual"
        onMouseDown={(event) => event.preventDefault()}
      >
        {completion.suggestions.map((suggestion) => (
          <li
            key={getOptionId(listId, suggestion)}
            id={getOptionId(listId, suggestion)}
            className="suggestion-option"
            role="option"
            aria-selected={suggestion === activeSuggestion}
            onClick={() => completion.pick(suggestion)}
          >
            <span className="list-item-body">
              <span className="list-item-title">{suggestion.title}</span>
              <span className="list-item-meta">{describeSuggestion(suggestion)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
