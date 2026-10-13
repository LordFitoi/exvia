'use client'

import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import type { Marker } from 'mapbox-gl'

import { useMapInstance } from '@/hooks/useMapInstance'
import { calculateBearing } from '@/services/bearing'
import { createUserMarkerElement, toLngLat } from '@/services/baseMap'
import type { BaseMap } from '@/services/baseMap'
import { addBuildingsLayer } from '@/services/buildingsLayer'
import { addEndpointMarkers, addRouteLine } from '@/services/routeMapLayers'
import type { Coordinates } from '@/types/geolocation'

const RIDE_ZOOM = 16.5
const RIDE_PITCH_DEGREES = 60
// The camera looks along the route, towards the point this many positions after the start.
const LOOK_AHEAD_POINTS = 10
const FOLLOW_DURATION_MS = 1000

interface RideMapOptions {
  accessToken: string | undefined
  path: readonly Coordinates[]
  /** The rider's street position, or null while it is unknown. */
  rider: Coordinates | null
}

interface RideMapHandle {
  containerRef: RefObject<HTMLDivElement | null>
  hasLoadFailed: boolean
  recenter: () => void
}

const getRouteBearing = (path: readonly Coordinates[]): number =>
  calculateBearing(path[0], path[Math.min(LOOK_AHEAD_POINTS, path.length - 1)])

/**
 * A pitched 3D map with extruded buildings and the route on it. The camera starts at the rider (or
 * the route start), facing along the route, and follows the rider until the map is dragged.
 */
export const useRideMap = ({ accessToken, path, rider }: RideMapOptions): RideMapHandle => {
  const pathRef = useRef(path)
  const riderRef = useRef(rider)
  const riderMarkerRef = useRef<Marker | null>(null)
  const isFollowingRef = useRef(true)

  useEffect(() => {
    pathRef.current = path
    riderRef.current = rider
  }, [path, rider])

  const handleReady = ({ map }: BaseMap) => {
    map.on('style.load', () => {
      addBuildingsLayer(map)
      addRouteLine(map, pathRef.current)
    })
    map.on('dragstart', () => {
      isFollowingRef.current = false
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

  useEffect(() => {
    if (!mounted) return
    const markers = addEndpointMarkers(mounted.mapboxgl, mounted.map, path)
    return () => markers.forEach((marker) => marker.remove())
  }, [mounted, path])

  useEffect(() => {
    if (!mounted || !rider) return
    if (riderMarkerRef.current) {
      riderMarkerRef.current.setLngLat(toLngLat(rider))
    } else {
      // The marker element is positioned by its own CSS (translate -50%), so anchor at its corner.
      riderMarkerRef.current = new mounted.mapboxgl.Marker({
        element: createUserMarkerElement(),
        anchor: 'top-left',
      })
        .setLngLat(toLngLat(rider))
        .addTo(mounted.map)
    }
    if (isFollowingRef.current) {
      mounted.map.easeTo({ center: toLngLat(rider), duration: FOLLOW_DURATION_MS })
    }
  }, [mounted, rider])

  useEffect(() => {
    const riderMarker = riderMarkerRef
    return () => {
      riderMarker.current = null
    }
  }, [mounted])

  const recenter = () => {
    isFollowingRef.current = true
    const target = riderRef.current ?? pathRef.current[0]
    mounted?.map.easeTo({ center: toLngLat(target), duration: FOLLOW_DURATION_MS })
  }

  return { containerRef, hasLoadFailed, recenter }
}
