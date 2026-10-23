'use client'

import { useMemo, useState } from 'react'

import { measurePath, trackProgress } from '@/services/routeProgress'
import type { MeasuredPath, PathLocation } from '@/services/routeProgress'
import type { Coordinates } from '@/types/geolocation'

export interface RideProgress {
  readonly measured: MeasuredPath
  /** The last spot of the track the rider was on, or null before they reached it. */
  readonly reached: PathLocation | null
}

interface RideProgressOptions {
  path: readonly Coordinates[]
  /** The rider's position, or null while it is unknown. */
  rider: Coordinates | null
}

interface TrackedProgress extends RideProgress {
  readonly rider: Coordinates | null
}

/**
 * Where the rider is on the track. Progress only moves forward, and leaving the track keeps the
 * last spot reached on it.
 */
export const useRideProgress = ({ path, rider }: RideProgressOptions): RideProgress => {
  const measured = useMemo(() => measurePath(path), [path])
  // Progress is kept per rider position; it is worked out while rendering, when a new one arrives.
  const [progress, setProgress] = useState<TrackedProgress>({ measured, rider: null, reached: null })
  if (progress.rider !== rider || progress.measured !== measured) {
    const previous = progress.measured === measured ? progress.reached : null
    const found = rider && trackProgress(measured, rider, previous?.distance ?? 0)
    const updated = { measured, rider, reached: found || previous }
    setProgress(updated)
    // The hooks that read this one in the same render must see where the rider is now, not at the last fix.
    return updated
  }
  return progress
}
