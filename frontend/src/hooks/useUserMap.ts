'use client'

import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import type { Marker } from 'mapbox-gl'

import { useMapInstance } from '@/hooks/useMapInstance'
import { createUserMarkerElement, toLngLat } from '@/services/baseMap'
import type { BaseMap } from '@/services/baseMap'
import type { Coordinates } from '@/types/geolocation'

const USER_ZOOM = 15

interface UserMapOptions {
  accessToken: string | undefined
  coordinates: Coordinates
}

interface UserMapHandle {
  containerRef: RefObject<HTMLDivElement | null>
  /** The created map, null until it is ready. */
  mounted: BaseMap | null
  hasLoadFailed: boolean
  recenter: () => void
}

export const useUserMap = ({ accessToken, coordinates }: UserMapOptions): UserMapHandle => {
  const coordinatesRef = useRef(coordinates)
  const markerRef = useRef<Marker | null>(null)

  useEffect(() => {
    coordinatesRef.current = coordinates
    markerRef.current?.setLngLat(toLngLat(coordinates))
  }, [coordinates])

  const handleReady = ({ mapboxgl, map }: BaseMap) => {
    // The marker element is positioned by its own CSS (translate -50%), so anchor at its corner.
    markerRef.current = new mapboxgl.Marker({ element: createUserMarkerElement(), anchor: 'top-left' })
      .setLngLat(toLngLat(coordinatesRef.current))
      .addTo(map)
  }

  const { containerRef, mounted, hasLoadFailed } = useMapInstance({
    accessToken,
    view: { center: coordinates, zoom: USER_ZOOM },
    onReady: handleReady,
  })

  const recenter = () => {
    mounted?.map.flyTo({ center: toLngLat(coordinatesRef.current), zoom: USER_ZOOM })
  }

  return { containerRef, mounted, hasLoadFailed, recenter }
}
