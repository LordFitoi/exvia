'use client'

import { useEffect } from 'react'

import { toLngLat } from '@/services/baseMap'
import type { BaseMap } from '@/services/baseMap'
import { createPinElement } from '@/services/placeLocationMarkers'
import type { Coordinates } from '@/types/geolocation'

/** Shows the pin of a pressed spot on the map while `coordinates` is set. */
export const usePinMarker = (mounted: BaseMap | null, coordinates: Coordinates | null): void => {
  useEffect(() => {
    if (!mounted || !coordinates) return
    // The element is centered by its own CSS (translate -50%), so anchor at the corner.
    const marker = new mounted.mapboxgl.Marker({ element: createPinElement(), anchor: 'top-left' })
      .setLngLat(toLngLat(coordinates))
      .addTo(mounted.map)
    return () => {
      marker.remove()
    }
  }, [mounted, coordinates])
}
