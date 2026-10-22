'use client'

import { useMemo } from 'react'

import { useStreetRoute } from '@/hooks/useStreetRoute'
import type { RideProgress } from '@/hooks/useRideProgress'
import { splitTrack } from '@/services/rideLines'
import type { RideLines } from '@/services/rideLines'
import type { Coordinates } from '@/types/geolocation'

interface RideLinesOptions {
  accessToken: string | undefined
  path: readonly Coordinates[]
  progress: RideProgress
  /** The rider's position, or null while it is unknown. */
  rider: Coordinates | null
}

/**
 * What to draw on the route for this rider. Until the rider reaches the track, the way to the
 * start plus the whole track; once on it, the part ridden and the part left.
 */
export const useRideLines = ({ accessToken, path, progress, rider }: RideLinesOptions): RideLines => {
  const { measured, reached } = progress

  const isApproaching = rider !== null && reached === null
  const { path: approach } = useStreetRoute({
    accessToken,
    from: isApproaching ? rider : null,
    to: path[0],
  })

  return useMemo(() => {
    const here = reached ?? { distance: 0, offset: 0, point: path[0] }
    return { ...splitTrack(measured, here), approach }
  }, [measured, reached, approach, path])
}
