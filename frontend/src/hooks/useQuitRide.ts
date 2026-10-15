'use client'

import { useState } from 'react'

import { ApiError } from '@/services/apiClient'
import { getAverageSpeed } from '@/services/rideSpeed'
import type { SpeedStats } from '@/services/rideSpeed'
import { createRideSummary } from '@/services/rideSummariesApi'

const SAVE_FAILED_MESSAGE = 'Your ride could not be saved. Check your connection, or quit without saving.'

interface QuitRideOptions {
  routeId: number
  /** When ride mode opened, in milliseconds since the epoch. */
  startedAt: number
  /** The speed readings of the ride so far. */
  speeds: SpeedStats
  /** Leaves ride mode. */
  onQuit: () => void
}

interface QuitRide {
  isPending: boolean
  /** Set when the ride could not be saved; confirming again then quits without saving. */
  error: string | null
  confirm: () => Promise<void>
  reset: () => void
}

/** Quitting before the finish saves the ride so far (not finished), then leaves ride mode. */
export const useQuitRide = ({ routeId, startedAt, speeds, onQuit }: QuitRideOptions): QuitRide => {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const confirm = async () => {
    if (error !== null) {
      onQuit()
      return
    }
    setIsPending(true)
    try {
      await createRideSummary(routeId, {
        startedAt,
        endedAt: Date.now(),
        isFinished: false,
        maxSpeed: speeds.max,
        minSpeed: speeds.min,
        avgSpeed: getAverageSpeed(speeds),
      })
      onQuit()
    } catch (failure) {
      console.error(`Could not save the ride of route ${routeId}`, failure)
      setError(failure instanceof ApiError ? failure.message : SAVE_FAILED_MESSAGE)
      setIsPending(false)
    }
  }

  const reset = () => {
    if (!isPending) setError(null)
  }

  return { isPending, error, confirm, reset }
}
