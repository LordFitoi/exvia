'use client'

import type { RefObject } from 'react'

import { useEdgeIndicators } from '@/hooks/useEdgeIndicators'
import { useMapInstance } from '@/hooks/useMapInstance'
import { useSavedPlaceMarkers } from '@/hooks/useSavedPlaceMarkers'
import { useRiderMarkers } from '@/hooks/useRiderMarkers'
import { useRiderFollow } from '@/hooks/useRiderFollow'
import { useRiderHeading } from '@/hooks/useRiderHeading'
import type { BaseMap } from '@/services/baseMap'
import { addBuildingsLayer } from '@/services/buildingsLayer'
import type { EdgeIndicator } from '@/services/edgeIndicators'
import type { RiderMarkerData } from '@/services/riderMarkers'
import type { Coordinates } from '@/types/geolocation'

const RIDE_ZOOM = 16.5
const RIDE_PITCH_DEGREES = 60

interface FreeRideMapOptions {
  accessToken: string | undefined
  /** The rider's position. */
  rider: Coordinates
  /** The other riders of the group, drawn as bubbles. */
  riders: readonly RiderMarkerData[]
}

interface FreeRideMapHandle {
  containerRef: RefObject<HTMLDivElement | null>
  hasLoadFailed: boolean
  recenter: () => void
  /** Moves the camera to a position, to find another rider. */
  focusOn: (position: Coordinates) => void
  /** The user and the riders who are out of view, to point to from the map edge. */
  indicators: readonly EdgeIndicator[]
}

/**
 * The pitched 3D map of a ride with no route: it starts at the rider, follows them turning to face
 * their heading until the map is dragged. The track being recorded is not drawn.
 */
export const useFreeRideMap = ({ accessToken, rider, riders }: FreeRideMapOptions): FreeRideMapHandle => {
  const handleReady = ({ map }: BaseMap) => {
    map.on('style.load', () => addBuildingsLayer(map))
  }

  const { containerRef, mounted, hasLoadFailed } = useMapInstance({
    accessToken,
    view: { center: rider, zoom: RIDE_ZOOM, pitch: RIDE_PITCH_DEGREES },
    onReady: handleReady,
  })

  useSavedPlaceMarkers(mounted)
  useRiderMarkers(mounted, riders)
  const indicators = useEdgeIndicators(mounted, rider, riders)

  const heading = useRiderHeading(rider)
  const { recenter, focusOn } = useRiderFollow({
    mounted,
    rider,
    heading,
    fallback: rider,
    recenterZoom: RIDE_ZOOM,
    recenterPitch: RIDE_PITCH_DEGREES,
  })

  return { containerRef, hasLoadFailed, recenter, focusOn, indicators }
}
