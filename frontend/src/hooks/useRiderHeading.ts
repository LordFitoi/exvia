'use client'

import { useState } from 'react'

import { calculateBearing } from '@/services/bearing'
import { interpolateBearing } from '@/services/riderMotion'
import { measureDistance } from '@/services/routeProgress'
import type { Coordinates } from '@/types/geolocation'

// Closer moves are GPS noise, which would spin the map while the rider stands still.
const MIN_HEADING_MOVE_METERS = 10
// How far each new reading pulls the heading: below 1 so a single odd fix does not turn the map.
const HEADING_WEIGHT = 0.6

interface HeadingState {
  /** The position the last reading was taken from. */
  readonly anchor: Coordinates | null
  readonly heading: number | null
}

/**
 * The compass bearing the rider is moving in, from where they were to where they are now. It
 * changes only after the rider has moved far enough, and stays as it was while they stand still.
 * Null until the first such move.
 */
export const useRiderHeading = (rider: Coordinates | null): number | null => {
  const [state, setState] = useState<HeadingState>({ anchor: rider, heading: null })
  if (rider && !state.anchor) {
    setState({ anchor: rider, heading: null })
  } else if (rider && state.anchor && measureDistance(state.anchor, rider) >= MIN_HEADING_MOVE_METERS) {
    const measured = calculateBearing(state.anchor, rider)
    const heading =
      state.heading === null ? measured : interpolateBearing(state.heading, measured, HEADING_WEIGHT)
    setState({ anchor: rider, heading })
  }
  return state.heading
}
