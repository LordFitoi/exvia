'use client'

import { useEffect, useState } from 'react'

import { createRideSummary } from '@/services/rideSummariesApi'
import { getAverageSpeed } from '@/services/rideSpeed'
import type { SpeedStats } from '@/services/rideSpeed'

export type SaveRideStatus = 'idle' | 'saving' | 'saved' | 'failed'

interface SaveRideSummaryOptions {
  routeId: number
  /** When ride mode opened, in milliseconds since the epoch. */
  startedAt: number
  /** When the rider arrived, in milliseconds since the epoch; null while still riding. */
  endedAt: number | null
  /** The speed readings of the ride, final once `endedAt` is set. */
  speeds: SpeedStats
}

interface SaveRideSummaryHandle {
  status: SaveRideStatus
  retry: () => void
}

/** Saves the ride on the server once the rider arrives (`endedAt` is set), with `retry` after a failure. */
export const useSaveRideSummary = ({
  routeId,
  startedAt,
  endedAt,
  speeds,
}: SaveRideSummaryOptions): SaveRideSummaryHandle => {
  const [outcome, setOutcome] = useState<'saved' | 'failed' | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (endedAt === null) return
    let isCancelled = false
    const save = async () => {
      try {
        await createRideSummary(routeId, {
          startedAt,
          endedAt,
          isFinished: true,
          maxSpeed: speeds.max,
          minSpeed: speeds.min,
          avgSpeed: getAverageSpeed(speeds),
        })
        if (!isCancelled) setOutcome('saved')
      } catch (error) {
        console.error(`Could not save the ride of route ${routeId}`, error)
        if (!isCancelled) setOutcome('failed')
      }
    }
    save()
    return () => {
      isCancelled = true
    }
  }, [routeId, startedAt, endedAt, speeds, attempt])

  const retry = () => {
    setOutcome(null)
    setAttempt((previous) => previous + 1)
  }

  if (endedAt === null) return { status: 'idle', retry }
  return { status: outcome ?? 'saving', retry }
}
