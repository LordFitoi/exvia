'use client'

import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { Map as MapboxMap, Marker } from 'mapbox-gl'

import { createBaseMap, createUserMarkerElement, toLngLat } from '@/services/baseMap'
import type { BaseMapOptions } from '@/services/baseMap'
import type { Coordinates } from '@/types/geolocation'

const USER_ZOOM = 15

interface UserMapOptions {
  accessToken: string | undefined
  coordinates: Coordinates
}

interface UserMapHandle {
  containerRef: RefObject<HTMLDivElement | null>
  hasLoadFailed: boolean
  recenter: () => void
}

interface MountedMap {
  map: MapboxMap
  marker: Marker
}

const mountMap = async (options: Omit<BaseMapOptions, 'zoom'>): Promise<MountedMap | null> => {
  const base = await createBaseMap({ ...options, zoom: USER_ZOOM })
  if (!base) return null
  // The marker element is positioned by its own CSS (translate -50%), so anchor at its corner.
  const marker = new base.mapboxgl.Marker({
    element: createUserMarkerElement(),
    anchor: 'top-left',
  })
    .setLngLat(toLngLat(options.center))
    .addTo(base.map)
  return { map: base.map, marker }
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
