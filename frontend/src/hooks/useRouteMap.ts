'use client'

import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'

import { useMapInstance } from '@/hooks/useMapInstance'
import { createUserMarkerElement, toLngLat } from '@/services/baseMap'
import type { BaseMap } from '@/services/baseMap'
import { flattenRoutePath } from '@/services/routePath'
import { addPointMarkers, addRouteLine, updateRouteLine } from '@/services/routeMapLayers'
import type { Coordinates } from '@/types/geolocation'
import type { DraftPoint } from '@/types/route'

const ROUTE_ZOOM = 15

interface RouteMapOptions {
  accessToken: string | undefined
  center: Coordinates
  points: readonly DraftPoint[]
  onMapClick: (coordinates: Coordinates) => void
  onPointRemove: (id: number) => void
}

interface RouteMapHandle {
  containerRef: RefObject<HTMLDivElement | null>
  hasLoadFailed: boolean
  recenter: () => void
}

export const useRouteMap = ({
  accessToken,
  center,
  points,
  onMapClick,
  onPointRemove,
}: RouteMapOptions): RouteMapHandle => {
  const centerRef = useRef(center)
  const pointsRef = useRef(points)
  const onMapClickRef = useRef(onMapClick)
  const onPointRemoveRef = useRef(onPointRemove)

  useEffect(() => {
    centerRef.current = center
    pointsRef.current = points
    onMapClickRef.current = onMapClick
    onPointRemoveRef.current = onPointRemove
  }, [center, points, onMapClick, onPointRemove])

  const handleReady = ({ mapboxgl, map }: BaseMap) => {
    // The marker element is positioned by its own CSS (translate -50%), so anchor at its corner.
    new mapboxgl.Marker({ element: createUserMarkerElement(), anchor: 'top-left' })
      .setLngLat(toLngLat(centerRef.current))
      .addTo(map)
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

  return { containerRef, hasLoadFailed, recenter }
}
