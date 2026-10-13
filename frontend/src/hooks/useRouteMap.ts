'use client'

import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'

import { createBaseMap, createUserMarkerElement, toLngLat } from '@/services/baseMap'
import type { BaseMap } from '@/services/baseMap'
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

interface MountOptions {
  container: HTMLDivElement
  accessToken: string
  center: Coordinates
  signal: AbortSignal
  onUnauthorized: () => void
}

const mountRouteMap = async (options: MountOptions): Promise<BaseMap | null> => {
  const base = await createBaseMap({ ...options, zoom: ROUTE_ZOOM })
  if (!base) return null
  // The marker element is positioned by its own CSS (translate -50%), so anchor at its corner.
  new base.mapboxgl.Marker({ element: createUserMarkerElement(), anchor: 'top-left' })
    .setLngLat(toLngLat(options.center))
    .addTo(base.map)
  return base
}

export const useRouteMap = ({
  accessToken,
  center,
  points,
  onMapClick,
  onPointRemove,
}: RouteMapOptions): RouteMapHandle => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState<BaseMap | null>(null)
  const [hasMountFailed, setHasMountFailed] = useState(false)
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

  useEffect(() => {
    const container = containerRef.current
    if (!accessToken || !container) return

    const controller = new AbortController()
    let createdMap: BaseMap | null = null
    const load = async () => {
      try {
        createdMap = await mountRouteMap({
          container,
          accessToken,
          center: centerRef.current,
          signal: controller.signal,
          onUnauthorized: () => setHasMountFailed(true),
        })
        if (!createdMap) return
        const { map } = createdMap
        map.on('style.load', () => addRouteLine(map, pointsRef.current))
        map.on('click', ({ lngLat }) =>
          onMapClickRef.current({ longitude: lngLat.lng, latitude: lngLat.lat }),
        )
        setMounted(createdMap)
      } catch (error) {
        console.error('Could not load the map', error)
        setHasMountFailed(true)
      }
    }
    load()

    return () => {
      controller.abort()
      createdMap?.map.remove()
      setMounted(null)
    }
  }, [accessToken])

  useEffect(() => {
    if (!mounted) return
    updateRouteLine(mounted.map, points)
    const markers = addPointMarkers(mounted.mapboxgl, mounted.map, points, (id) =>
      onPointRemoveRef.current(id),
    )
    return () => markers.forEach((marker) => marker.remove())
  }, [mounted, points])

  const recenter = () => {
    mounted?.map.flyTo({ center: toLngLat(centerRef.current), zoom: ROUTE_ZOOM })
  }

  return { containerRef, hasLoadFailed: hasMountFailed || !accessToken, recenter }
}
