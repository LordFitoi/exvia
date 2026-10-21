'use client'

import { useState } from 'react'

import { addSpeedReading } from '@/services/rideSpeed'

interface RideMaxSpeedOptions {
  /** The device's latest speed in m/s, or null when it gave none. */
  speed: number | null
  /** When that reading was taken; each new time counts one reading. */
  fixTime: number | null
  /** False once the rider has arrived, which freezes the top speed. */
  isRiding: boolean
}

/** The top speed of the ride so far in km/h, from the GPS readings; null until the device gives one. */
export const useRideMaxSpeed = ({ speed, fixTime, isRiding }: RideMaxSpeedOptions): number | null => {
  const [maxSpeed, setMaxSpeed] = useState<number | null>(null)
  const [countedFixTime, setCountedFixTime] = useState<number | null>(null)

  if (isRiding && fixTime !== null && fixTime !== countedFixTime) {
    setCountedFixTime(fixTime)
    setMaxSpeed(addSpeedReading(maxSpeed, speed))
  }

  return maxSpeed
}
