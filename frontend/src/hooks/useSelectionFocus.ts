'use client'

import { useEffect } from 'react'

import { toLngLat } from '@/services/baseMap'
import type { BaseMap } from '@/services/baseMap'
import type { PlaceSelection } from '@/types/placeLocation'

const SELECTION_ZOOM = 16
// The place card covers the lower part of the map, so the selected spot is centered above it.
const CARD_PADDING = { top: 0, left: 0, right: 0, bottom: 260 }
const NO_PADDING = { top: 0, left: 0, right: 0, bottom: 0 }

const getSelectedCoordinates = (selection: PlaceSelection) =>
  selection.kind === 'pin' ? selection.coordinates : selection.place.coordinates

/** Moves the camera to the selected spot at the default zoom, clear of the place card, and gives the room back when the card closes. */
export const useSelectionFocus = (mounted: BaseMap | null, selection: PlaceSelection | null): void => {
  useEffect(() => {
    if (!mounted) return
    const { map } = mounted
    if (selection) {
      map.easeTo({ center: toLngLat(getSelectedCoordinates(selection)), zoom: SELECTION_ZOOM, padding: CARD_PADDING })
      return
    }
    // A one-shot camera move: nothing to undo, and the map may already be gone when the screen closes.
    if ((map.getPadding().bottom ?? 0) > 0) map.easeTo({ padding: NO_PADDING })
  }, [mounted, selection])
}
