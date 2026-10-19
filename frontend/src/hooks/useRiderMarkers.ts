'use client'

import { useEffect, useRef } from 'react'
import type { Marker } from 'mapbox-gl'

import type { BaseMap } from '@/services/baseMap'
import { toLngLat } from '@/services/baseMap'
import { addRiderMarker } from '@/services/riderBubbleMarker'
import type { RiderMarkerData } from '@/services/riderMarkers'

/** Keeps one marker on the map per rider: new riders get one, moved riders slide, gone riders lose theirs. */
export const useRiderMarkers = (mounted: BaseMap | null, riders: readonly RiderMarkerData[]): void => {
  const markersRef = useRef(new Map<number, Marker>())

  useEffect(() => {
    if (!mounted) return
    const markers = markersRef.current
    riders.forEach((rider) => {
      const existing = markers.get(rider.id)
      if (existing) existing.setLngLat(toLngLat(rider.position))
      else markers.set(rider.id, addRiderMarker(mounted.mapboxgl, mounted.map, rider))
    })
    const presentIds = new Set(riders.map(({ id }) => id))
    markers.forEach((marker, id) => {
      if (presentIds.has(id)) return
      marker.remove()
      markers.delete(id)
    })
  }, [mounted, riders])

  useEffect(() => {
    const markers = markersRef.current
    return () => {
      markers.forEach((marker) => marker.remove())
      markers.clear()
    }
  }, [mounted])
}
