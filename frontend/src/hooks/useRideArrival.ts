'use client'

import { useEffect, useState } from 'react'

import type { RideProgress } from '@/hooks/useRideProgress'
import { getPathLength } from '@/services/routeProgress'

// Within this many meters of the finish, along the track, the rider has arrived; GPS is never exact.
const ARRIVAL_METERS = 40
const MILLISECONDS_PER_SECOND = 1000
const ARRIVAL_VIBRATION_MS = [200, 100, 200]

interface RideTimes {
  readonly startedAt: number | null
  readonly finishedAt: number | null
}

interface RideStatus {
  readonly isOnTrack: boolean
  readonly hasArrived: boolean
}

interface RideArrivalOptions {
  progress: RideProgress
  /** When the rider's latest GPS fix was taken, in milliseconds since the epoch. */
  fixTime: number | null
}

const NOT_STARTED: RideTimes = { startedAt: null, finishedAt: null }

/** The times after this fix: the start is the first fix on the track, the finish the first at the end. */
const advanceTimes = (times: RideTimes, fixTime: number, { isOnTrack, hasArrived }: RideStatus): RideTimes => {
  const startedAt = times.startedAt ?? (isOnTrack ? fixTime : null)
  const finishedAt = times.finishedAt ?? (hasArrived ? fixTime : null)
  if (startedAt === times.startedAt && finishedAt === times.finishedAt) return times
  return { startedAt, finishedAt }
}

const getRideStatus = ({ measured, reached }: RideProgress): RideStatus => ({
  isOnTrack: reached !== null,
  hasArrived: reached !== null && getPathLength(measured) - reached.distance <= ARRIVAL_METERS,
})

/**
 * The time the ride took, in seconds, once the rider reaches the finish; null until then. The
 * clock starts when the rider first gets on the track, so the way to the start does not count.
 * Times are the GPS fixes' own, and the phone vibrates on arrival where it can.
 */
export const useRideArrival = ({ progress, fixTime }: RideArrivalOptions): number | null => {
  const [times, setTimes] = useState<RideTimes>(NOT_STARTED)
  const status = getRideStatus(progress)
  const next = fixTime === null ? times : advanceTimes(times, fixTime, status)
  if (next !== times) setTimes(next)

  const { hasArrived } = status
  useEffect(() => {
    if (hasArrived && 'vibrate' in navigator) navigator.vibrate(ARRIVAL_VIBRATION_MS)
  }, [hasArrived])

  if (next.startedAt === null || next.finishedAt === null) return null
  return (next.finishedAt - next.startedAt) / MILLISECONDS_PER_SECOND
}
