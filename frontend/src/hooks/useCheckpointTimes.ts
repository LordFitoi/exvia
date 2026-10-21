'use client'

import { useMemo, useState } from 'react'

import type { RideProgress } from '@/hooks/useRideProgress'
import { measureCheckpoints } from '@/services/routeProgress'
import type { Coordinates } from '@/types/geolocation'

// Within this many meters of a checkpoint, along the track, the rider has reached it; GPS is never exact.
const CHECKPOINT_METERS = 40
const START_DISTANCE = 0

interface CheckpointTimesOptions {
  progress: RideProgress
  /** The points the rider chose for the route: the start, the checkpoints and the finish. */
  waypoints: readonly Coordinates[]
  /** When the rider's latest GPS fix was taken, in milliseconds since the epoch. */
  fixTime: number | null
}

/**
 * When the rider reached the start and then each checkpoint (the waypoints between the start and the finish),
 * in route order and in milliseconds since the epoch: the time of the first GPS fix at or past it. The start is
 * reached once the rider is on the track, not when ride mode opens, as they may still be riding to it. A stop the
 * rider has not reached yet has no entry, and one skipped past between two fixes shares the later fix.
 * The times are only ever added to: the group reloads the route as new arrays whenever someone joins or
 * leaves, and that must not erase them. A different route remounts the ride, which starts them over.
 */
export const useCheckpointTimes = ({ progress, waypoints, fixTime }: CheckpointTimesOptions): readonly number[] => {
  const distances = useMemo(
    () => [START_DISTANCE, ...measureCheckpoints(progress.measured, waypoints.slice(1, -1))],
    [progress.measured, waypoints],
  )
  const [times, setTimes] = useState<readonly number[]>([])
  const covered = progress.reached?.distance ?? null
  const reachedCount =
    covered === null ? 0 : distances.filter((distance) => distance - CHECKPOINT_METERS <= covered).length

  if (fixTime !== null && reachedCount > times.length) {
    setTimes([...times, ...Array<number>(reachedCount - times.length).fill(fixTime)])
  }
  return times
}
