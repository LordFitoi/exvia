'use client'

import { useEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'

import { useEdgeIndicators } from '@/hooks/useEdgeIndicators'
import { useMapInstance } from '@/hooks/useMapInstance'
import { useSavedPlaceMarkers } from '@/hooks/useSavedPlaceMarkers'
import { useRiderFollow } from '@/hooks/useRiderFollow'
import { useRiderHeading } from '@/hooks/useRiderHeading'
import { calculateBearing } from '@/services/bearing'
import type { BaseMap } from '@/services/baseMap'
import { addBuildingsLayer } from '@/services/buildingsLayer'
import type { EdgeIndicator } from '@/services/edgeIndicators'
import type { RideLines } from '@/services/rideLines'
import { addRideLines, updateRideLines } from '@/services/rideMapLayers'
import { addFinishMarker } from '@/services/routeMapLayers'
import type { Coordinates } from '@/types/geolocation'

const RIDE_ZOOM = 16.5
const RIDE_PITCH_DEGREES = 60
const NO_LINE: readonly Coordinates[] = []
const NO_RIDERS: readonly never[] = []

interface DestinationMapOptions {
  accessToken: string | undefined
  rider: Coordinates
  destination: Coordinates
  /** The street path from the rider to the destination; empty while it loads. */
  path: readonly Coordinates[]
}

interface DestinationMapHandle {
  containerRef: RefObject<HTMLDivElement | null>
  hasLoadFailed: boolean
  recenter: () => void
  /** The rider, when out of view, to point to from the map edge. */
  indicators: readonly EdgeIndicator[]
}

/**
 * The pitched 3D map of a ride to a place: the path from the rider to the destination and a finish flag
 * on it. The camera starts at the rider facing the destination, then follows them until the map is dragged.
 */
export const useDestinationMap = ({
  accessToken,
  rider,
  destination,
  path,
}: DestinationMapOptions): DestinationMapHandle => {
  const lines = useMemo<RideLines>(() => ({ passed: NO_LINE, approach: NO_LINE, remaining: path }), [path])
  const linesRef = useRef(lines)

  useEffect(() => {
    linesRef.current = lines
  }, [lines])

  const handleReady = ({ map }: BaseMap) => {
    map.on('style.load', () => {
      addBuildingsLayer(map)
      addRideLines(map, linesRef.current)
    })
  }

  const { containerRef, mounted, hasLoadFailed } = useMapInstance({
    accessToken,
    view: {
      center: rider,
      zoom: RIDE_ZOOM,
      pitch: RIDE_PITCH_DEGREES,
      bearing: calculateBearing(rider, destination),
    },
    onReady: handleReady,
  })

  useSavedPlaceMarkers(mounted)

  useEffect(() => {
    if (!mounted) return
    const marker = addFinishMarker(mounted.mapboxgl, mounted.map, destination)
    return () => {
      marker.remove()
    }
  }, [mounted, destination])

  useEffect(() => {
    if (mounted) updateRideLines(mounted.map, lines)
  }, [mounted, lines])

  const indicators = useEdgeIndicators(mounted, rider, NO_RIDERS)
  const heading = useRiderHeading(rider)
  const { recenter } = useRiderFollow({
    mounted,
    rider,
    heading,
    fallback: rider,
    recenterZoom: RIDE_ZOOM,
    recenterPitch: RIDE_PITCH_DEGREES,
  })

  return { containerRef, hasLoadFailed, recenter, indicators }
}
