'use client'

import { useEffect, useState } from 'react'

import { measureDistance } from '@/services/routeProgress'
import type { Coordinates } from '@/types/geolocation'

// Within this many meters of the destination the rider has arrived; GPS and places are never exact.
const ARRIVAL_METERS = 50
const ARRIVAL_VIBRATION_MS = [200, 100, 200]

interface DestinationArrivalOptions {
  rider: Coordinates
  /** Where the rider is going: the end of the street path when there is one, else the place itself. */
  destination: Coordinates
  /** When the rider's latest GPS fix was taken, in milliseconds since the epoch. */
  fixTime: number | null
}

/**
 * When the rider arrived at the destination, in milliseconds since the epoch (the time of the first
 * GPS fix there), or null until then. The phone vibrates on arrival where it can.
 */
export const useDestinationArrival = ({ rider, destination, fixTime }: DestinationArrivalOptions): number | null => {
  const [arrivedAt, setArrivedAt] = useState<number | null>(null)
  const hasArrived = measureDistance(rider, destination) <= ARRIVAL_METERS
  if (arrivedAt === null && hasArrived && fixTime !== null) setArrivedAt(fixTime)

  useEffect(() => {
    if (hasArrived && 'vibrate' in navigator) navigator.vibrate(ARRIVAL_VIBRATION_MS)
  }, [hasArrived])

  return arrivedAt
}
