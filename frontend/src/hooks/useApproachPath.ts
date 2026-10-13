'use client'

import { useEffect, useState } from 'react'

import { measureDistance } from '@/services/routeProgress'
import { fetchStreetPath } from '@/services/streetRouteApi'
import type { Coordinates } from '@/types/geolocation'

// The way to the start is asked again only after the rider has moved this far, so a walking
// rider does not send a request on every GPS fix.
const REFETCH_DISTANCE_METERS = 50
const NO_PATH: readonly Coordinates[] = []

interface ApproachPathOptions {
  accessToken: string | undefined
  /** Where the rider is, or null when there is no need for a path. */
  from: Coordinates | null
  to: Coordinates
}

/** The street path from the rider to `to`; empty while it loads, fails, or `from` is null. */
export const useApproachPath = ({
  accessToken,
  from,
  to,
}: ApproachPathOptions): readonly Coordinates[] => {
  const [origin, setOrigin] = useState(from)
  const [path, setPath] = useState<readonly Coordinates[]>(NO_PATH)
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
        const street = await fetchStreetPath(
          { longitude: originLongitude, latitude: originLatitude },
          { longitude: toLongitude, latitude: toLatitude },
          { accessToken, signal: controller.signal },
        )
        setPath(street ?? NO_PATH)
      } catch (error) {
        if (controller.signal.aborted) return
        console.error('Could not find the way to the route start', error)
        setPath(NO_PATH)
      }
    }
    load()
    return () => controller.abort()
  }, [accessToken, originLongitude, originLatitude, toLongitude, toLatitude])

  return from ? path : NO_PATH
}
