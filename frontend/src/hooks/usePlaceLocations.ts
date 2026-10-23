'use client'

import { useCallback, useEffect, useState } from 'react'

import { fetchPlaceLocations, PLACE_LOCATIONS_LIMIT } from '@/services/placeLocationsApi'
import type { BaseMap } from '@/services/baseMap'
import { containsViewport, expandViewport, readViewport } from '@/services/viewport'
import type { PlaceLocation } from '@/types/placeLocation'
import type { Viewport } from '@/types/viewport'

interface FetchedArea {
  readonly viewport: Viewport
  /** Whether the answer had every place of the viewport, so any part of it needs no new request. */
  readonly isComplete: boolean
}

interface PlaceLocations {
  readonly places: readonly PlaceLocation[]
  /** Shows a place that was just saved. */
  addPlace: (place: PlaceLocation) => void
}

/**
 * The rider's saved places in the part of the map in view. Only that part is asked of the server, each
 * time the camera stops, and a request is skipped while the view stays inside an area already loaded.
 * A camera that never stops, such as the one following a rider, asks for a `marginRatio` of the view
 * more on every side, or it would ask at every move.
 */
export const usePlaceLocations = (mounted: BaseMap | null, marginRatio = 0): PlaceLocations => {
  const [places, setPlaces] = useState<readonly PlaceLocation[]>([])

  useEffect(() => {
    if (!mounted) return
    const { map } = mounted
    let pending: AbortController | null = null
    let fetched: FetchedArea | null = null

    const load = async () => {
      const view = readViewport(map.getBounds())
      if (fetched?.isComplete && containsViewport(fetched.viewport, view)) return
      const viewport = expandViewport(view, marginRatio)
      pending?.abort()
      const request = new AbortController()
      pending = request
      try {
        const found = await fetchPlaceLocations(viewport, request.signal)
        if (request.signal.aborted) return
        fetched = { viewport, isComplete: found.length < PLACE_LOCATIONS_LIMIT }
        setPlaces(found)
      } catch (error) {
        if (!request.signal.aborted) console.error('Could not load the saved places', error)
      }
    }

    load()
    map.on('moveend', load)
    return () => {
      pending?.abort()
      map.off('moveend', load)
    }
  }, [mounted, marginRatio])

  const addPlace = useCallback((place: PlaceLocation) => setPlaces((previous) => [...previous, place]), [])

  return { places, addPlace }
}
