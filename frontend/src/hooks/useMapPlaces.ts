'use client'

import { useState } from 'react'

import { useMapLongPress } from '@/hooks/useMapLongPress'
import { usePinMarker } from '@/hooks/usePinMarker'
import { usePlaceLocations } from '@/hooks/usePlaceLocations'
import { usePlaceMarkers } from '@/hooks/usePlaceMarkers'
import { useSelectionFocus } from '@/hooks/useSelectionFocus'
import type { BaseMap } from '@/services/baseMap'
import type { PlaceLocation, PlaceSelection } from '@/types/placeLocation'

interface MapPlaces {
  /** The spot or saved place the place card describes, if any. */
  readonly selection: PlaceSelection | null
  /** Shows a place that was just saved. */
  addPlace: (place: PlaceLocation) => void
  /** Hides a place that was just deleted. */
  removePlace: (placeId: number) => void
  clearSelection: () => void
}

/**
 * The places on the map: the rider's saved places in view, the pin of a spot pressed and held, and
 * which of them the place card describes. A tap on the map, or on nothing, closes the card.
 */
export const useMapPlaces = (mounted: BaseMap | null): MapPlaces => {
  const { places, addPlace, removePlace } = usePlaceLocations(mounted)
  const [selection, setSelection] = useState<PlaceSelection | null>(null)

  const clearSelection = () => setSelection(null)

  useMapLongPress(mounted, {
    onLongPress: (coordinates) => setSelection({ kind: 'pin', coordinates }),
    onTap: clearSelection,
  })
  usePlaceMarkers(mounted, places, (place) => setSelection({ kind: 'saved', place }))
  usePinMarker(mounted, selection?.kind === 'pin' ? selection.coordinates : null)
  useSelectionFocus(mounted, selection)

  return { selection, addPlace, removePlace, clearSelection }
}
