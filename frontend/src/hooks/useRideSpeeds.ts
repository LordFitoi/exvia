'use client'

import { useState } from 'react'

import { addSpeedReading, EMPTY_SPEED_STATS } from '@/services/rideSpeed'
import type { SpeedStats } from '@/services/rideSpeed'

interface RideSpeedsOptions {
  /** The device's latest speed in m/s, or null when it gave none. */
  speed: number | null
  /** When that reading was taken; each new time counts one reading. */
  fixTime: number | null
  /** False once the rider has arrived, which freezes the stats. */
  isRiding: boolean
}

/** The max, lowest and average speed of the ride so far, from the GPS readings. */
export const useRideSpeeds = ({ speed, fixTime, isRiding }: RideSpeedsOptions): SpeedStats => {
  const [stats, setStats] = useState(EMPTY_SPEED_STATS)
  const [countedFixTime, setCountedFixTime] = useState<number | null>(null)

  if (isRiding && fixTime !== null && fixTime !== countedFixTime) {
    setCountedFixTime(fixTime)
    setStats(addSpeedReading(stats, speed))
  }

  return stats
}
