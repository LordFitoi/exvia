'use client'

import { useEffect, useState } from 'react'

import { fetchRoute } from '@/services/routesApi'
import type { RouteDetail } from '@/types/route'

type RouteDetailStatus = 'idle' | 'loading' | 'ready' | 'failed'

interface RouteDetailHandle {
  status: RouteDetailStatus
  /** The route with the requested id, once loaded. */
  route: RouteDetail | null
  /** The last route that loaded, even while another one is loading, so a preview does not blink;
   * null when nothing is selected. */
  shownRoute: RouteDetail | null
  retry: () => void
}

/** Loads one route with its path. The status is derived from which id has loaded or failed. */
export const useRouteDetail = (routeId: string | null): RouteDetailHandle => {
  const [loaded, setLoaded] = useState<RouteDetail | null>(null)
  const [failedId, setFailedId] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (routeId === null) return
    let isCancelled = false
    const load = async () => {
      try {
        const route = await fetchRoute(routeId)
        if (!isCancelled) setLoaded(route)
      } catch (error) {
        console.error(`Could not load route ${routeId}`, error)
        if (!isCancelled) setFailedId(routeId)
      }
    }
    load()
    return () => {
      isCancelled = true
    }
  }, [routeId, attempt])

  const isReady = routeId !== null && loaded?.id === routeId
  const retry = () => {
    setFailedId(null)
    setAttempt((previous) => previous + 1)
  }

  const getStatus = (): RouteDetailStatus => {
    if (routeId === null) return 'idle'
    if (isReady) return 'ready'
    return failedId === routeId ? 'failed' : 'loading'
  }

  return {
    status: getStatus(),
    route: isReady ? loaded : null,
    shownRoute: routeId === null ? null : loaded,
    retry,
  }
}
