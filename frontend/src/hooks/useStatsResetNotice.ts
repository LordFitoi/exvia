'use client'

import { useEffect, useRef } from 'react'

const STATS_RESET_MESSAGE = 'Ride stats were reset for the new route'
const STATS_RESET_FREE_MESSAGE = 'Ride stats were reset for the free ride'
const STATS_RESET_ICON_CLASS = 'icon-info'

/**
 * Tells the rider their stats started over when the group moves to another route, or to free mode:
 * the ride screen is a new ride then, with its own clock and speeds. `routeId` is null in free mode.
 */
export const useStatsResetNotice = (
  routeId: string | null,
  announce: (message: string, iconClass: string) => void,
): void => {
  const shownRouteId = useRef(routeId)

  useEffect(() => {
    if (shownRouteId.current === routeId) return
    shownRouteId.current = routeId
    announce(routeId === null ? STATS_RESET_FREE_MESSAGE : STATS_RESET_MESSAGE, STATS_RESET_ICON_CLASS)
  }, [routeId, announce])
}
