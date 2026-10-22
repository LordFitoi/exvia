'use client'

import { useState } from 'react'

import { measureDistance } from '@/services/routeProgress'
import type { Coordinates } from '@/types/geolocation'

// Closer moves are GPS noise, which would add up while the rider stands still.
const MIN_STEP_METERS = 10
const METERS_PER_KILOMETER = 1000

interface DistanceState {
  /** The position the last step was measured from. */
  readonly anchor: Coordinates
  readonly meters: number
}

/**
 * The kilometres the rider has covered since the ride began, adding up their moves of at least 10 m. It
 * stops counting while `isRiding` is false (the rider arrived).
 */
export const useRideDistance = (rider: Coordinates, isRiding: boolean): number => {
  const [state, setState] = useState<DistanceState>({ anchor: rider, meters: 0 })
  const step = measureDistance(state.anchor, rider)
  if (isRiding && step >= MIN_STEP_METERS) setState({ anchor: rider, meters: state.meters + step })
  return state.meters / METERS_PER_KILOMETER
}
