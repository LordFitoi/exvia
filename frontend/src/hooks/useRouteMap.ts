'use client'

import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'

import { useMapInstance } from '@/hooks/useMapInstance'
import { createUserMarkerElement, toLngLat } from '@/services/baseMap'
import type { BaseMap } from '@/services/baseMap'
import { flattenRoutePath } from '@/services/routePath'
import {
  addPointMarkers,
  addRouteLine,
  fitPathBounds,
  updateRouteLine,
} from '@/services/routeMapLayers'
import type { Coordinates } from '@/types/geolocation'
import type { DraftPoint } from '@/types/route'

const ROUTE_ZOOM = 15
// The bottom sheet covers the lower part of the map, so a fitted route keeps clear of it.
const FIT_PADDING = { top: 64, left: 32, right: 32, bottom: 360 }

interface RouteMapOptions {
  accessToken: string | undefined
  center: Coordinates
  /** Where to show the "You" marker; null shows none. */
  userPosition: Coordinates | null
  /** A path the camera frames once when the map is ready, for editing a saved route. */
  fitPath: readonly Coordinates[] | null
  points: readonly DraftPoint[]
  onMapClick: (coordinates: Coordinates) => void
  onPointRemove: (id: number) => void
}

interface RouteMapHandle {
  containerRef: RefObject<HTMLDivElement | null>
  hasLoadFailed: boolean
  recenter: () => void
  /** Flies to a spot, in the part of the map that the sheet leaves free. */
  focusOn: (coordinates: Coordinates) => void
}

export const useRouteMap = ({
  accessToken,
  center,
  userPosition,
  fitPath,
  points,
  onMapClick,
  onPointRemove,
}: RouteMapOptions): RouteMapHandle => {
  const centerRef = useRef(center)
  const userPositionRef = useRef(userPosition)
  const fitPathRef = useRef(fitPath)
  const pointsRef = useRef(points)
  const onMapClickRef = useRef(onMapClick)
  const onPointRemoveRef = useRef(onPointRemove)

  useEffect(() => {
    centerRef.current = center
    userPositionRef.current = userPosition
    fitPathRef.current = fitPath
    pointsRef.current = points
    onMapClickRef.current = onMapClick
    onPointRemoveRef.current = onPointRemove
  }, [center, userPosition, fitPath, points, onMapClick, onPointRemove])

  const handleReady = ({ mapboxgl, map }: BaseMap) => {
    if (userPositionRef.current) {
      // The marker element is positioned by its own CSS (translate -50%), so anchor at its corner.
      new mapboxgl.Marker({ element: createUserMarkerElement(), anchor: 'top-left' })
        .setLngLat(toLngLat(userPositionRef.current))
        .addTo(map)
    }
    map.on('style.load', () => addRouteLine(map, flattenRoutePath(pointsRef.current)))
    map.on('click', ({ lngLat }) =>
      onMapClickRef.current({ longitude: lngLat.lng, latitude: lngLat.lat }),
    )
  }

  const { containerRef, mounted, hasLoadFailed } = useMapInstance({
    accessToken,
    view: { center, zoom: ROUTE_ZOOM },
    onReady: handleReady,
  })

  useEffect(() => {
    if (!mounted || !fitPathRef.current) return
    fitPathBounds(mounted.mapboxgl, mounted.map, fitPathRef.current, {
      padding: FIT_PADDING,
      isAnimated: false,
    })
  }, [mounted])

  useEffect(() => {
    if (!mounted) return
    updateRouteLine(mounted.map, flattenRoutePath(points))
    const markers = addPointMarkers(mounted.mapboxgl, mounted.map, points, (id) =>
      onPointRemoveRef.current(id),
    )
    return () => markers.forEach((marker) => marker.remove())
  }, [mounted, points])

  const recenter = () => {
    mounted?.map.flyTo({ center: toLngLat(centerRef.current), zoom: ROUTE_ZOOM })
  }

  const focusOn = (coordinates: Coordinates) => {
    mounted?.map.flyTo({ center: toLngLat(coordinates), zoom: ROUTE_ZOOM, padding: FIT_PADDING })
  }

  return { containerRef, hasLoadFailed, recenter, focusOn }
}
