'use client'

import { useEffect, useState } from 'react'

import type { RideProgress } from '@/hooks/useRideProgress'
import { getPathLength } from '@/services/routeProgress'

// Within this many meters of the finish, along the track, the rider has arrived; GPS is never exact.
const ARRIVAL_METERS = 40
const ARRIVAL_VIBRATION_MS = [200, 100, 200]

interface RideArrivalOptions {
  progress: RideProgress
  /** When the rider's latest GPS fix was taken, in milliseconds since the epoch. */
  fixTime: number | null
}

const hasReachedFinish = ({ measured, reached }: RideProgress): boolean =>
  reached !== null && getPathLength(measured) - reached.distance <= ARRIVAL_METERS

/**
 * When the rider arrived at the finish, in milliseconds since the epoch (the time of the first GPS
 * fix at the end), or null until then. The phone vibrates on arrival where it can.
 */
export const useRideArrival = ({ progress, fixTime }: RideArrivalOptions): number | null => {
  const [arrivedAt, setArrivedAt] = useState<number | null>(null)
  const hasArrived = hasReachedFinish(progress)
  if (arrivedAt === null && hasArrived && fixTime !== null) setArrivedAt(fixTime)

  useEffect(() => {
    if (hasArrived && 'vibrate' in navigator) navigator.vibrate(ARRIVAL_VIBRATION_MS)
  }, [hasArrived])

  return arrivedAt
}
