'use client'

import { useRef, useState } from 'react'

import { ApiError } from '@/services/apiClient'
import { getAverageSpeed } from '@/services/rideSpeed'
import type { SpeedStats } from '@/services/rideSpeed'
import { createRoute } from '@/services/routesApi'
import { createRideSummary } from '@/services/rideSummariesApi'
import { optimizeTrack } from '@/services/trackOptimizer'
import type { Coordinates } from '@/types/geolocation'

const SAVE_FAILED_MESSAGE =
  'Your ride could not be saved. Check your connection and keep riding to try again, or leave without saving.'
const MIN_TRACK_POINTS = 2
const ROUTE_NAME_PREFIX = 'Free ride'
const ROUTE_NAME_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
}

interface FinishFreeRideOptions {
  /** The track recorded so far. */
  track: readonly Coordinates[]
  /** When the free ride began, in milliseconds since the epoch. */
  startedAt: number
  /** The speed readings of the ride so far. */
  speeds: SpeedStats
  /** Called once the track and the ride are saved. */
  onSaved: () => void
  /** Called when the rider leaves without saving. */
  onLeave: () => void
}

interface FinishFreeRide {
  /** Whether the track has enough points to be saved as a route. */
  canSave: boolean
  isPending: boolean
  /** Set when saving failed; confirming again then leaves without saving. */
  error: string | null
  confirm: () => Promise<void>
  reset: () => void
}

const buildRouteName = (startedAt: number): string =>
  `${ROUTE_NAME_PREFIX} ${new Date(startedAt).toLocaleString(undefined, ROUTE_NAME_DATE_FORMAT)}`

/**
 * Finishing a free ride saves the optimized track as a new route with a temporary name, then saves
 * the ride of that route. A rider who has not moved has no track, so there is nothing to save. If
 * the ride fails after the route was saved, the next try reuses that route instead of making another.
 */
export const useFinishFreeRide = ({
  track,
  startedAt,
  speeds,
  onSaved,
  onLeave,
}: FinishFreeRideOptions): FinishFreeRide => {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const savedRouteIdRef = useRef<string | null>(null)
  const canSave = track.length >= MIN_TRACK_POINTS

  const saveRoute = async (): Promise<string> => {
    if (savedRouteIdRef.current) return savedRouteIdRef.current
    const route = await createRoute({
      name: buildRouteName(startedAt),
      description: '',
      points: optimizeTrack(track),
      waypoints: [],
    })
    savedRouteIdRef.current = route.id
    return route.id
  }

  const confirm = async () => {
    if (error !== null || !canSave) {
      onLeave()
      return
    }
    setIsPending(true)
    try {
      const routeId = await saveRoute()
      await createRideSummary(routeId, {
        startedAt,
        endedAt: Date.now(),
        isFinished: true,
        maxSpeed: speeds.max,
        minSpeed: speeds.min,
        avgSpeed: getAverageSpeed(speeds),
      })
      onSaved()
    } catch (failure) {
      console.error('Could not save the free ride', failure)
      setError(failure instanceof ApiError ? failure.message : SAVE_FAILED_MESSAGE)
      setIsPending(false)
    }
  }

  const reset = () => {
    if (!isPending) setError(null)
  }

  return { canSave, isPending, error, confirm, reset }
}
