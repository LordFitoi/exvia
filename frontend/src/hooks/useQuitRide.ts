'use client'

import { useState } from 'react'

import { ApiError } from '@/services/apiClient'
import { createRideSummary } from '@/services/rideSummariesApi'

const SAVE_FAILED_MESSAGE = 'Your ride could not be saved. Check your connection, or quit without saving.'

interface QuitRideOptions {
  routeId: string
  /** The group the ride is taken in. */
  groupId: string
  /** When ride mode opened, in milliseconds since the epoch. */
  startedAt: number
  /** The top speed of the ride so far in km/h, or null when the device gave none. */
  maxSpeed: number | null
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
export const useQuitRide = ({ routeId, groupId, startedAt, maxSpeed, onQuit }: QuitRideOptions): QuitRide => {
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
        groupId,
        startedAt,
        endedAt: Date.now(),
        isFinished: false,
        maxSpeed,
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
