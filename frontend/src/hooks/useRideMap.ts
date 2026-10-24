'use client'

import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'

import { useEdgeIndicators } from '@/hooks/useEdgeIndicators'
import { useMapInstance } from '@/hooks/useMapInstance'
import { useSavedPlaceMarkers } from '@/hooks/useSavedPlaceMarkers'
import { useRiderMarkers } from '@/hooks/useRiderMarkers'
import { useRiderFollow } from '@/hooks/useRiderFollow'
import { useRiderHeading } from '@/hooks/useRiderHeading'
import { calculateBearing } from '@/services/bearing'
import type { BaseMap } from '@/services/baseMap'
import { addBuildingsLayer } from '@/services/buildingsLayer'
import type { EdgeIndicator } from '@/services/edgeIndicators'
import type { RideLines } from '@/services/rideLines'
import { addRideLines, updateRideLines } from '@/services/rideMapLayers'
import { addRouteMarkers } from '@/services/routeMapLayers'
import type { RiderMarkerData } from '@/services/riderMarkers'
import type { Coordinates } from '@/types/geolocation'
import type { Waypoint } from '@/types/route'

const RIDE_ZOOM = 16.5
const RIDE_PITCH_DEGREES = 60
// The camera looks along the route, towards the point this many positions after the start.
const LOOK_AHEAD_POINTS = 10

interface RideMapOptions {
  accessToken: string | undefined
  path: readonly Coordinates[]
  /** The points the rider chose, shown as checkpoints. */
  waypoints: readonly Waypoint[]
  lines: RideLines
  /** The rider's position, or null while it is unknown. */
  rider: Coordinates | null
  /** The other riders of the group, drawn as bubbles. */
  riders: readonly RiderMarkerData[]
}

interface RideMapHandle {
  containerRef: RefObject<HTMLDivElement | null>
  hasLoadFailed: boolean
  recenter: () => void
  /** Moves the camera to a position, to find another rider. */
  focusOn: (position: Coordinates) => void
  /** The user and the riders who are out of view, to point to from the map edge. */
  indicators: readonly EdgeIndicator[]
}

const getRouteBearing = (path: readonly Coordinates[]): number =>
  calculateBearing(path[0], path[Math.min(LOOK_AHEAD_POINTS, path.length - 1)])

/**
 * A pitched 3D map with extruded buildings and the ride lines on it. The camera starts at the
 * rider (or the route start), facing along the route; then it follows the rider, turning to face
 * the direction they move in, until the map is dragged.
 */
export const useRideMap = ({ accessToken, path, waypoints, lines, rider, riders }: RideMapOptions): RideMapHandle => {
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
      center: rider ?? path[0],
      zoom: RIDE_ZOOM,
      pitch: RIDE_PITCH_DEGREES,
      bearing: getRouteBearing(path),
    },
    onReady: handleReady,
  })

  useSavedPlaceMarkers(mounted)

  useEffect(() => {
    if (!mounted) return
    const markers = addRouteMarkers(mounted.mapboxgl, mounted.map, { path, waypoints })
    return () => markers.forEach((marker) => marker.remove())
  }, [mounted, path, waypoints])

  useEffect(() => {
    if (mounted) updateRideLines(mounted.map, lines)
  }, [mounted, lines])

  useRiderMarkers(mounted, riders, path)
  const indicators = useEdgeIndicators(mounted, rider, riders)

  const heading = useRiderHeading(rider)
  const { recenter, focusOn } = useRiderFollow({
    mounted,
    rider,
    heading,
    fallback: path[0],
    recenterZoom: RIDE_ZOOM,
    recenterPitch: RIDE_PITCH_DEGREES,
  })

  return { containerRef, hasLoadFailed, recenter, focusOn, indicators }
}
