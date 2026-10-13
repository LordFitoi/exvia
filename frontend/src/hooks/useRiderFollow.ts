'use client'

import { useEffect, useRef } from 'react'
import type { Marker } from 'mapbox-gl'

import { createUserMarkerElement, toLngLat } from '@/services/baseMap'
import type { BaseMap } from '@/services/baseMap'
import { interpolateBearing, interpolatePosition, runAnimation } from '@/services/riderMotion'
import type { Coordinates } from '@/types/geolocation'

// About one GPS fix apart, so the rider is always still gliding to the last fix when the next lands.
const GLIDE_DURATION_MS = 1000
const RECENTER_DURATION_MS = 800

/** The rider as shown: where the marker is and which way the camera faces. */
interface RiderView {
  readonly position: Coordinates
  readonly bearing: number
}

interface RiderFollowOptions {
  mounted: BaseMap | null
  /** The rider's position, or null while it is unknown. */
  rider: Coordinates | null
  /** The way the rider is moving, as a compass bearing, or null before it is known. */
  heading: number | null
  /** Where the locate button goes while the rider's position is unknown. */
  fallback: Coordinates
}

const createMarker = ({ mapboxgl, map }: BaseMap, position: Coordinates): Marker =>
  // The marker element is positioned by its own CSS (translate -50%), so anchor at its corner.
  new mapboxgl.Marker({ element: createUserMarkerElement(), anchor: 'top-left' })
    .setLngLat(toLngLat(position))
    .addTo(map)

/**
 * Shows the rider on the map and keeps the camera on them, turned to face their heading. Each new
 * fix glides the marker and the camera there (position and bearing together); the first one jumps.
 * Dragging the map stops the following until the returned `recenter` is called.
 */
export const useRiderFollow = ({ mounted, rider, heading, fallback }: RiderFollowOptions): (() => void) => {
  const markerRef = useRef<Marker | null>(null)
  const viewRef = useRef<RiderView | null>(null)
  const isFollowingRef = useRef(true)

  useEffect(() => {
    if (!mounted) return
    const handleDragStart = () => {
      isFollowingRef.current = false
    }
    mounted.map.on('dragstart', handleDragStart)
    return () => {
      mounted.map.off('dragstart', handleDragStart)
      markerRef.current?.remove()
      markerRef.current = null
      viewRef.current = null
    }
  }, [mounted])

  useEffect(() => {
    if (!mounted || !rider) return
    const { map } = mounted
    const marker = markerRef.current ?? createMarker(mounted, rider)
    markerRef.current = marker
    // A glide that was cut short by this fix continues from where it had got to.
    const from = viewRef.current ?? { position: rider, bearing: heading ?? map.getBearing() }
    const to = { position: rider, bearing: heading ?? from.bearing }

    const showFrame = (progress: number) => {
      const position = interpolatePosition(from.position, to.position, progress)
      const bearing = interpolateBearing(from.bearing, to.bearing, progress)
      viewRef.current = { position, bearing }
      marker.setLngLat(toLngLat(position))
      // The recenter ease runs its own camera; this frame only moves the marker meanwhile.
      if (isFollowingRef.current && !map.isEasing()) map.jumpTo({ center: toLngLat(position), bearing })
    }
    return runAnimation(GLIDE_DURATION_MS, showFrame)
  }, [mounted, rider, heading])

  return () => {
    isFollowingRef.current = true
    const view = viewRef.current
    mounted?.map.easeTo({
      center: toLngLat(view?.position ?? fallback),
      bearing: view?.bearing ?? mounted.map.getBearing(),
      duration: RECENTER_DURATION_MS,
    })
  }
}
