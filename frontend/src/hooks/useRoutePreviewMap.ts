'use client'

import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'

import { useMapInstance } from '@/hooks/useMapInstance'
import type { BaseMap } from '@/services/baseMap'
import { addRouteLine, addRouteMarkers, fitPathBounds, updateRouteLine } from '@/services/routeMapLayers'
import type { Coordinates } from '@/types/geolocation'

const PREVIEW_ZOOM = 12
const PREVIEW_PADDING_PX = 40

interface RoutePreviewMapOptions {
  accessToken: string | undefined
  path: readonly Coordinates[]
  /** The points the rider chose, shown as checkpoints; empty when the route has none. */
  waypoints: readonly Coordinates[]
}

interface RoutePreviewMapHandle {
  containerRef: RefObject<HTMLDivElement | null>
  hasLoadFailed: boolean
}

/** A map that shows a whole route: the line, its start, checkpoints and finish markers, framed in view. */
export const useRoutePreviewMap = ({
  accessToken,
  path,
  waypoints,
}: RoutePreviewMapOptions): RoutePreviewMapHandle => {
  const pathRef = useRef(path)
  const hasFittedRef = useRef(false)

  useEffect(() => {
    pathRef.current = path
  }, [path])

  const handleReady = ({ map }: BaseMap) => {
    map.on('style.load', () => addRouteLine(map, pathRef.current))
  }

  const { containerRef, mounted, hasLoadFailed } = useMapInstance({
    accessToken,
    view: { center: path[0], zoom: PREVIEW_ZOOM },
    onReady: handleReady,
  })

  useEffect(() => {
    if (!mounted) return
    const { mapboxgl, map } = mounted
    updateRouteLine(map, path)
    // The first fit is instant, because the map has just been created around the route.
    fitPathBounds(mapboxgl, map, path, { padding: PREVIEW_PADDING_PX, isAnimated: hasFittedRef.current })
    hasFittedRef.current = true
    const markers = addRouteMarkers(mapboxgl, map, { path, waypoints })
    return () => markers.forEach((marker) => marker.remove())
  }, [mounted, path, waypoints])

  return { containerRef, hasLoadFailed }
}
