'use client'

import { useEffect, useRef, useState } from 'react'

import { ApiError } from '@/services/apiClient'
import { MAPBOX_ACCESS_TOKEN } from '@/services/mapboxConfig'
import { createRoute } from '@/services/routesApi'
import { createRideSummary } from '@/services/rideSummariesApi'
import { buildTrackRoute, getTrackRouteName } from '@/services/trackRoute'
import type { LegCache } from '@/services/trackRoute'
import type { TrackPoint, TrackRoute } from '@/types/track'

const SAVE_FAILED_MESSAGE = 'Your track could not be saved. Check your connection and try again.'
const NO_MAP_SERVICE_MESSAGE = 'The map service is not available, so the track cannot be turned into a route.'

const PROGRESS_MESSAGES = {
  following: 'Following the streets…',
  route: 'Saving the route…',
  ride: 'Saving the ride…',
} as const

type SaveProgress = keyof typeof PROGRESS_MESSAGES

interface SaveTrackOptions {
  /** The group the ride was taken in. */
  groupId: string
  /** When the ride began and ended, in milliseconds since the epoch. */
  startedAt: number
  endedAt: number
  /** The top speed of the ride in km/h, or null when the device gave none. */
  maxSpeed: number | null
  /** The path ridden, two points at least. */
  track: readonly TrackPoint[]
  /** Called once the route and the ride are saved. */
  onSaved: () => void
}

interface SaveTrack {
  readonly isPending: boolean
  /** What is being done while `isPending`, as a sentence. */
  readonly progress: string | null
  /** Set when the last attempt failed; saving again picks up where it stopped. */
  readonly error: string | null
  readonly save: () => Promise<void>
}

/** The route that was created for the track, which a retry must not create again. */
interface SavedTrackRoute {
  readonly id: string
  readonly reachedAt: TrackRoute['reachedAt']
}

/**
 * Turns the track into a route named "Track" and the day, then saves the ride on it, so the track shows in the
 * ride history. The three steps (following the streets, saving the route, saving the ride) run in order, and a
 * failed attempt that is tried again goes on from the step that failed.
 */
export const useSaveTrack = ({ groupId, startedAt, endedAt, maxSpeed, track, onSaved }: SaveTrackOptions): SaveTrack => {
  const [progress, setProgress] = useState<SaveProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [legCache] = useState<LegCache>(() => new Map())
  const savedRouteRef = useRef<SavedTrackRoute | null>(null)
  const controllerRef = useRef(new AbortController())

  useEffect(() => {
    const controller = new AbortController()
    controllerRef.current = controller
    return () => controller.abort()
  }, [])

  const saveRoute = async (): Promise<SavedTrackRoute> => {
    if (savedRouteRef.current) return savedRouteRef.current
    if (!MAPBOX_ACCESS_TOKEN) throw new Error(NO_MAP_SERVICE_MESSAGE)
    setProgress('following')
    const built = await buildTrackRoute(track, {
      accessToken: MAPBOX_ACCESS_TOKEN,
      signal: controllerRef.current.signal,
      cache: legCache,
    })
    setProgress('route')
    const route = { name: getTrackRouteName(endedAt), description: '', points: built.points, waypoints: built.waypoints }
    const saved = await createRoute(route)
    savedRouteRef.current = { id: saved.id, reachedAt: built.reachedAt }
    return savedRouteRef.current
  }

  const save = async () => {
    setError(null)
    try {
      const { id, reachedAt } = await saveRoute()
      setProgress('ride')
      await createRideSummary(id, { groupId, startedAt, endedAt, isFinished: true, maxSpeed, reachedAt })
      onSaved()
    } catch (failure) {
      if (controllerRef.current.signal.aborted) return
      console.error(`Could not save the track of group ${groupId}`, failure)
      setError(failure instanceof ApiError ? failure.message : SAVE_FAILED_MESSAGE)
      setProgress(null)
    }
  }

  return { isPending: progress !== null, progress: progress && PROGRESS_MESSAGES[progress], error, save }
}
