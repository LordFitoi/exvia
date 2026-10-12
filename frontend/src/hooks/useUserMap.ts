'use client'

import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { Map as MapboxMap, Marker } from 'mapbox-gl'

import type { Coordinates } from '@/types/geolocation'

const LIGHT_MAP_STYLE = 'mapbox://styles/mapbox/light-v11'
const DARK_MAP_STYLE = 'mapbox://styles/mapbox/dark-v11'
const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)'
const USER_ZOOM = 15
const USER_MARKER_LABEL = 'You'
const HTTP_UNAUTHORIZED = 401

interface UserMapOptions {
  accessToken: string | undefined
  coordinates: Coordinates
}

interface UserMapHandle {
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

interface MountedMap {
  map: MapboxMap
  marker: Marker
}

const toLngLat = ({ longitude, latitude }: Coordinates): [number, number] => [longitude, latitude]

const getMapStyle = (isDark: boolean): string => (isDark ? DARK_MAP_STYLE : LIGHT_MAP_STYLE)

const isUnauthorizedError = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'status' in error && error.status === HTTP_UNAUTHORIZED

const createUserMarkerElement = (): HTMLDivElement => {
  const dot = document.createElement('div')
  dot.className = 'marker-me'
  const label = document.createElement('span')
  label.className = 'marker-label'
  label.textContent = USER_MARKER_LABEL
  dot.append(label)
  return dot
}

// mapbox-gl touches `window` on import, so it is loaded only in the browser, after mount.
const mountMap = async ({
  container,
  accessToken,
  center,
  signal,
  onUnauthorized,
}: MountOptions): Promise<MountedMap | null> => {
  const { default: mapboxgl } = await import('mapbox-gl')
  if (signal.aborted) return null

  const darkScheme = window.matchMedia(DARK_SCHEME_QUERY)
  const map = new mapboxgl.Map({
    container,
    accessToken,
    style: getMapStyle(darkScheme.matches),
    center: toLngLat(center),
    zoom: USER_ZOOM,
  })
  // The marker element is positioned by its own CSS (translate -50%), so anchor at its corner.
  const marker = new mapboxgl.Marker({ element: createUserMarkerElement(), anchor: 'top-left' })
    .setLngLat(toLngLat(center))
    .addTo(map)

  map.on('error', ({ error }) => {
    if (isUnauthorizedError(error)) onUnauthorized()
  })
  darkScheme.addEventListener('change', (event) => map.setStyle(getMapStyle(event.matches)), {
    signal,
  })
  return { map, marker }
}

export const useUserMap = ({ accessToken, coordinates }: UserMapOptions): UserMapHandle => {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapboxMap | null>(null)
  const markerRef = useRef<Marker | null>(null)
  const coordinatesRef = useRef(coordinates)
  const [hasMountFailed, setHasMountFailed] = useState(false)

  useEffect(() => {
    coordinatesRef.current = coordinates
    markerRef.current?.setLngLat(toLngLat(coordinates))
  }, [coordinates])

  useEffect(() => {
    const container = containerRef.current
    if (!accessToken || !container) return

    const controller = new AbortController()
    const load = async () => {
      try {
        const mounted = await mountMap({
          container,
          accessToken,
          center: coordinatesRef.current,
          signal: controller.signal,
          onUnauthorized: () => setHasMountFailed(true),
        })
        if (!mounted) return
        mapRef.current = mounted.map
        markerRef.current = mounted.marker
      } catch (error) {
        console.error('Could not load the map', error)
        setHasMountFailed(true)
      }
    }
    load()

    return () => {
      controller.abort()
      mapRef.current?.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [accessToken])

  const recenter = () => {
    mapRef.current?.flyTo({ center: toLngLat(coordinatesRef.current), zoom: USER_ZOOM })
  }

  return { containerRef, hasLoadFailed: hasMountFailed || !accessToken, recenter }
}
