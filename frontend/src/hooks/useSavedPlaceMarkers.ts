'use client'

import { usePlaceLocations } from '@/hooks/usePlaceLocations'
import { usePlaceMarkers } from '@/hooks/usePlaceMarkers'
import type { BaseMap } from '@/services/baseMap'
import type { PlaceLocation } from '@/types/placeLocation'

// A route being drawn or a ride keeps moving the camera, so places are loaded half a view beyond it.
const MOVING_MAP_MARGIN_RATIO = 0.5

/**
 * Shows the rider's saved places on a map that has other work for its taps and camera. With `onSelect`
 * they are buttons that choose the place (the route creator adds it as a point); without it, landmarks
 * that take no taps (the ride maps).
 */
export const useSavedPlaceMarkers = (
  mounted: BaseMap | null,
  onSelect: ((place: PlaceLocation) => void) | null = null,
): void => {
  const { places } = usePlaceLocations(mounted, MOVING_MAP_MARGIN_RATIO)
  usePlaceMarkers(mounted, places, onSelect)
}
