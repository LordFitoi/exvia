'use client'

import { useEffect, useState } from 'react'

const MILLISECONDS_PER_SECOND = 1000

/**
 * The seconds since ride mode opened, counting up once per second until `finishedAt` (when the
 * rider arrived, in milliseconds since the epoch; null while still riding), where it stops.
 */
export const useRideElapsed = (finishedAt: number | null): number => {
  const [startedAt] = useState(() => Date.now())
  const [now, setNow] = useState(startedAt)
  const isRunning = finishedAt === null

  useEffect(() => {
    if (!isRunning) return
    const timer = setInterval(() => setNow(Date.now()), MILLISECONDS_PER_SECOND)
    return () => clearInterval(timer)
  }, [isRunning])

  return Math.max(0, ((finishedAt ?? now) - startedAt) / MILLISECONDS_PER_SECOND)
}
