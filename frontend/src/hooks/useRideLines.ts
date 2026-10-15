'use client'

import { useMemo, useState } from 'react'

import { useApproachPath } from '@/hooks/useApproachPath'
import { splitTrack } from '@/services/rideLines'
import type { RideLines } from '@/services/rideLines'
import { measurePath, trackProgress } from '@/services/routeProgress'
import type { MeasuredPath, PathLocation } from '@/services/routeProgress'
import type { Coordinates } from '@/types/geolocation'

interface Progress {
  readonly measured: MeasuredPath
  readonly rider: Coordinates | null
  /** The last spot of the track the rider was on, or null before they reached it. */
  readonly reached: PathLocation | null
}

interface RideLinesOptions {
  accessToken: string | undefined
  path: readonly Coordinates[]
  /** The rider's position, or null while it is unknown. */
  rider: Coordinates | null
}

/**
 * What to draw on the route for this rider. Until the rider reaches the track, the way to the
 * start plus the whole track; once on it, the part ridden and the part left.
 * Progress only moves forward, and leaving the track keeps the last spot reached on it.
 */
export const useRideLines = ({ accessToken, path, rider }: RideLinesOptions): RideLines => {
  const measured = useMemo(() => measurePath(path), [path])
  // Progress is kept per rider position; it is worked out while rendering, when a new one arrives.
  const [progress, setProgress] = useState<Progress>({ measured, rider: null, reached: null })
  if (progress.rider !== rider || progress.measured !== measured) {
    const previous = progress.measured === measured ? progress.reached : null
    const found = rider && trackProgress(measured, rider, previous?.distance ?? 0)
    setProgress({ measured, rider, reached: found || previous })
  }
  const { reached } = progress

  const isApproaching = rider !== null && reached === null
  const approach = useApproachPath({
    accessToken,
    from: isApproaching ? rider : null,
    to: path[0],
  })

  return useMemo(() => {
    const here = reached ?? { distance: 0, offset: 0, point: path[0] }
    return { ...splitTrack(measured, here), approach }
  }, [measured, reached, approach, path])
}
