'use client'

import { useEffect, useState } from 'react'

import { createRideSummary } from '@/services/rideSummariesApi'

export type SaveRideStatus = 'idle' | 'saving' | 'saved' | 'failed'

interface SaveRideSummaryOptions {
  routeId: string
  /** The group the ride is taken in. */
  groupId: string
  /** When ride mode opened, in milliseconds since the epoch. */
  startedAt: number
  /** When the rider arrived, in milliseconds since the epoch; null while still riding. */
  endedAt: number | null
  /** The top speed of the ride in km/h, final once `endedAt` is set; null when the device gave none. */
  maxSpeed: number | null
  /** When the start and then each checkpoint were reached, in milliseconds since the epoch; final once `endedAt` is set. */
  reachedAt: readonly number[]
}

interface SaveRideSummaryHandle {
  status: SaveRideStatus
  retry: () => void
}

/** Saves the ride on the server once the rider arrives (`endedAt` is set), with `retry` after a failure. */
export const useSaveRideSummary = ({
  routeId,
  groupId,
  startedAt,
  endedAt,
  maxSpeed,
  reachedAt,
}: SaveRideSummaryOptions): SaveRideSummaryHandle => {
  const [outcome, setOutcome] = useState<'saved' | 'failed' | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (endedAt === null) return
    let isCancelled = false
    const save = async () => {
      try {
        await createRideSummary(routeId, {
          groupId,
          startedAt,
          endedAt,
          isFinished: true,
          maxSpeed,
          reachedAt,
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
  }, [routeId, groupId, startedAt, endedAt, maxSpeed, reachedAt, attempt])

  const retry = () => {
    setOutcome(null)
    setAttempt((previous) => previous + 1)
  }

  if (endedAt === null) return { status: 'idle', retry }
  return { status: outcome ?? 'saving', retry }
}
