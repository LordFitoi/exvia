'use client'

import { useState } from 'react'

import { CHECKPOINT_METERS } from '@/hooks/useCheckpointTimes'
import { measureDistance } from '@/services/routeProgress'
import type { Coordinates } from '@/types/geolocation'

const METERS_PER_KILOMETER = 1000

/**
 * The straight-line kilometres from where the rider was when ride mode opened (their first known position) to
 * the start of the route, which is the length of the leg the speed of the start is worked out from. Null while
 * the position is unknown, and when the rider opened ride mode already at the start: there is no leg then.
 */
export const useApproachKilometres = (rider: Coordinates | null, start: Coordinates): number | null => {
  const [origin, setOrigin] = useState<Coordinates | null>(null)
  if (origin === null && rider !== null) setOrigin(rider)
  if (origin === null) return null
  const meters = measureDistance(origin, start)
  return meters > CHECKPOINT_METERS ? meters / METERS_PER_KILOMETER : null
}
