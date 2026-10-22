'use client'

import { useEffect, useState } from 'react'

import { measureDistance } from '@/services/routeProgress'
import { fetchStreetRoute } from '@/services/streetRouteApi'
import type { Coordinates } from '@/types/geolocation'
import type { StreetRoute } from '@/types/streetRoute'

// The way to the start is asked again only after the rider has moved this far, so a walking
// rider does not send a request on every GPS fix.
const REFETCH_DISTANCE_METERS = 50
const NO_ROUTE: StreetRoute = { path: [], distance: 0, duration: 0 }

interface StreetRouteOptions {
  accessToken: string | undefined
  /** Where the rider is, or null when there is no need for a path. */
  from: Coordinates | null
  to: Coordinates
}

/** The street route from the rider to `to`; empty while it loads, fails, or `from` is null. */
export const useStreetRoute = ({
  accessToken,
  from,
  to,
}: StreetRouteOptions): StreetRoute => {
  const [origin, setOrigin] = useState(from)
  const [route, setRoute] = useState(NO_ROUTE)
  if (from && (!origin || measureDistance(origin, from) > REFETCH_DISTANCE_METERS)) {
    setOrigin(from)
  }
  const originLongitude = origin?.longitude
  const originLatitude = origin?.latitude
  const { longitude: toLongitude, latitude: toLatitude } = to

  useEffect(() => {
    if (!accessToken || originLongitude === undefined || originLatitude === undefined) return

    const controller = new AbortController()
    const load = async () => {
      try {
        const street = await fetchStreetRoute(
          { longitude: originLongitude, latitude: originLatitude },
          { longitude: toLongitude, latitude: toLatitude },
          { accessToken, signal: controller.signal },
        )
        setRoute(street ?? NO_ROUTE)
      } catch (error) {
        if (controller.signal.aborted) return
        console.error('Could not find the street route', error)
        setRoute(NO_ROUTE)
      }
    }
    load()
    return () => controller.abort()
  }, [accessToken, originLongitude, originLatitude, toLongitude, toLatitude])

  return from ? route : NO_ROUTE
}
