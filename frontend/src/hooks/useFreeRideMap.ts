'use client'

import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'

import { useMapInstance } from '@/hooks/useMapInstance'
import { useRiderFollow } from '@/hooks/useRiderFollow'
import { useRiderHeading } from '@/hooks/useRiderHeading'
import type { BaseMap } from '@/services/baseMap'
import { addBuildingsLayer } from '@/services/buildingsLayer'
import { addRouteLine, updateRouteLine } from '@/services/routeMapLayers'
import type { Coordinates } from '@/types/geolocation'

const RIDE_ZOOM = 16.5
const RIDE_PITCH_DEGREES = 60

interface FreeRideMapOptions {
  accessToken: string | undefined
  /** The track recorded so far, drawn as it grows. */
  track: readonly Coordinates[]
  /** The rider's position. */
  rider: Coordinates
}

interface FreeRideMapHandle {
  containerRef: RefObject<HTMLDivElement | null>
  hasLoadFailed: boolean
  recenter: () => void
}

/**
 * The pitched 3D map of a ride with no route: it starts at the rider, follows them turning to face
 * their heading until the map is dragged, and draws the track recorded so far.
 */
export const useFreeRideMap = ({ accessToken, track, rider }: FreeRideMapOptions): FreeRideMapHandle => {
  const trackRef = useRef(track)

  useEffect(() => {
    trackRef.current = track
  }, [track])

  const handleReady = ({ map }: BaseMap) => {
    map.on('style.load', () => {
      addBuildingsLayer(map)
      addRouteLine(map, trackRef.current)
    })
  }

  const { containerRef, mounted, hasLoadFailed } = useMapInstance({
    accessToken,
    view: { center: rider, zoom: RIDE_ZOOM, pitch: RIDE_PITCH_DEGREES },
    onReady: handleReady,
  })

  useEffect(() => {
    if (mounted) updateRouteLine(mounted.map, track)
  }, [mounted, track])

  const heading = useRiderHeading(rider)
  const recenter = useRiderFollow({ mounted, rider, heading, fallback: rider, recenterZoom: RIDE_ZOOM })

  return { containerRef, hasLoadFailed, recenter }
}
