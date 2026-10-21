'use client'

import { useMemo, useState } from 'react'

import type { RideProgress } from '@/hooks/useRideProgress'
import { measureCheckpoints, measureDistance, trackPassing } from '@/services/routeProgress'
import type { MeasuredPath } from '@/services/routeProgress'
import type { Coordinates } from '@/types/geolocation'

// Within this many meters of a stop, along the track or in a straight line, the rider has reached it; GPS is
// never exact.
const CHECKPOINT_METERS = 40
const START_DISTANCE = 0

interface CheckpointTimesOptions {
  progress: RideProgress
  /** The points the rider chose for the route: the start, the checkpoints and the finish. */
  waypoints: readonly Coordinates[]
  /** The rider's position, or null while it is unknown. */
  rider: Coordinates | null
  /** When the rider's latest GPS fix was taken, in milliseconds since the epoch. */
  fixTime: number | null
  /** False once the rider has arrived: the times are final then, as the ride is saved with them. */
  isRiding: boolean
}

/** The start or a checkpoint: where it is, and how far along the track. */
interface Stop {
  readonly point: Coordinates
  readonly distance: number
}

/** The start and then each checkpoint (the waypoints between the start and the finish), in route order. */
const buildStops = (path: MeasuredPath, waypoints: readonly Coordinates[]): Stop[] => {
  const checkpoints = waypoints.slice(1, -1)
  const distances = measureCheckpoints(path, checkpoints)
  return [
    { point: path.points[0], distance: START_DISTANCE },
    ...checkpoints.map((point, index) => ({ point, distance: distances[index] })),
  ]
}

/**
 * A stop is reached when the rider has got as far along the track as it, or when the rider is near it
 * wherever they are: a rider who takes another way still passes the checkpoint.
 */
const hasReached = (stop: Stop, covered: number | null, rider: Coordinates | null): boolean => {
  const hasPassedAlongTrack = covered !== null && stop.distance - CHECKPOINT_METERS <= covered
  return hasPassedAlongTrack || (rider !== null && measureDistance(stop.point, rider) <= CHECKPOINT_METERS)
}

/**
 * When the rider reached the start and then each checkpoint, in route order and in milliseconds since the
 * epoch. Reaching a stop reaches all those before it, like the route line colors the whole stretch behind the
 * rider: one skipped by taking another street is marked when the rider comes back or goes past, with that
 * fix's time. How far the rider has got is where they are beside the track, even on another street (see
 * `trackPassing`), not only where they are on it. A stop the rider has not got to yet has no entry. The start
 * counts once the rider is there, not when ride mode opens, as they may still be riding to it.
 * The times are only ever added to: the group reloads the route as new arrays whenever someone joins or
 * leaves, and that must not erase them. They freeze when the rider arrives, since the ride is saved with them
 * then. A different route remounts the ride, which starts them over.
 */
export const useCheckpointTimes = ({
  progress,
  waypoints,
  rider,
  fixTime,
  isRiding,
}: CheckpointTimesOptions): readonly number[] => {
  const stops = useMemo(() => buildStops(progress.measured, waypoints), [progress.measured, waypoints])
  const [times, setTimes] = useState<readonly number[]>([])
  // How far the rider has got beside the track, which goes on while they are on another street.
  const [passed, setPassed] = useState<number | null>(null)
  const onTrack = progress.reached?.distance ?? null
  const passing = rider && trackPassing(progress.measured, rider, Math.max(onTrack ?? 0, passed ?? 0))
  if (passing !== null && passing > (passed ?? -1)) setPassed(passing)

  const covered = onTrack === null && passed === null ? null : Math.max(onTrack ?? 0, passed ?? 0)
  const reachedCount = stops.findLastIndex((stop) => hasReached(stop, covered, rider)) + 1

  if (isRiding && fixTime !== null && reachedCount > times.length) {
    setTimes([...times, ...Array<number>(reachedCount - times.length).fill(fixTime)])
  }
  return times
}
