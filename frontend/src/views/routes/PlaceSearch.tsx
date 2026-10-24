'use client'

import { useId } from 'react'

import { usePlaceCompletion } from '@/hooks/usePlaceCompletion'
import { useSuggestionPopover } from '@/hooks/useSuggestionPopover'
import { MAPBOX_ACCESS_TOKEN } from '@/services/mapboxConfig'
import type { Coordinates } from '@/types/geolocation'
import type { Place } from '@/types/place'
import type { PlaceLocation } from '@/types/placeLocation'
import PlaceSearchInput from '@/views/routes/PlaceSearchInput'
import PlaceSuggestionList from '@/views/routes/PlaceSuggestionList'

interface PlaceSearchProps {
  /** Places near this spot are offered first. */
  proximity: Coordinates
  /** What the field is for, for screen readers: the visible placeholder only names what can be typed. */
  label: string
  /** A saved place also comes with `savedPlace`, so it can be told from a place the services found. */
  onSelect: (place: Place, savedPlace?: PlaceLocation) => void
}

/**
 * The search field over the map: places, addresses and categories (gas stations, restaurants) that
 * match what is typed are offered under it (WAI-ARIA combobox). Picking a category lists its places.
 * With nothing typed, the categories are offered; coordinates and Google Maps links are understood.
 */
export default function PlaceSearch({ proximity, label, onSelect }: PlaceSearchProps) {
  const listId = useId()
  const completion = usePlaceCompletion({ accessToken: MAPBOX_ACCESS_TOKEN, proximity, onSelect })
  const { inputRef, listRef } = useSuggestionPopover(completion.isVisible, completion.close)

  return (
    <div className="input-group map-search">
      <span className="icon icon-search" aria-hidden="true"></span>
      <PlaceSearchInput inputRef={inputRef} listId={listId} label={label} completion={completion} />
      <PlaceSuggestionList listRef={listRef} listId={listId} completion={completion} />
    </div>
  )
}
