'use client'

import { useState } from 'react'

import { measureDistance } from '@/services/routeProgress'
import type { Coordinates } from '@/types/geolocation'
import type { TrackPoint } from '@/types/track'

// Closer moves are GPS noise, which would add up while the rider stands still.
const MIN_STEP_METERS = 10
const METERS_PER_KILOMETER = 1000

interface RecordedTrack {
  readonly points: readonly TrackPoint[]
  readonly meters: number
}

interface TrackRecorder {
  /** The path ridden so far, in order, with when each point was reached. */
  readonly points: readonly TrackPoint[]
  readonly kilometres: number
}

/**
 * Records the path the rider rides: their position whenever they have moved at least 10 m from the last point
 * kept, with the time of the fix. Nothing is recorded until the first fix has a time.
 */
export const useTrackRecorder = (rider: Coordinates, fixTime: number | null): TrackRecorder => {
  const [track, setTrack] = useState<RecordedTrack>({ points: [], meters: 0 })
  const last = track.points.at(-1)
  const step = last ? measureDistance(last.coordinates, rider) : Infinity
  if (fixTime !== null && step >= MIN_STEP_METERS) {
    const meters = last ? track.meters + step : 0
    setTrack({ points: [...track.points, { coordinates: rider, at: fixTime }], meters })
  }
  return { points: track.points, kilometres: track.meters / METERS_PER_KILOMETER }
}
