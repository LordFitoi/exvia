'use client'

import { useEffect, useRef } from 'react'

import { getGroupSelection, isSameSelection } from '@/services/rideSelection'
import type { RideSelection } from '@/types/rideSelection'
import type { RouteGroup } from '@/types/routeGroup'

const STATS_RESET_ICON_CLASS = 'icon-info'
const STATS_RESET_MESSAGES: Readonly<Record<RideSelection['kind'], string>> = {
  route: 'Ride stats were reset for the new route',
  free: 'Ride stats were reset for the free ride',
  track: 'Ride stats were reset for the track ride',
}

/**
 * Tells the rider their stats started over when the group moves to another route, or to free or track mode:
 * the ride screen is a new ride then, with its own clock and speeds.
 */
export const useStatsResetNotice = (
  group: RouteGroup,
  announce: (message: string, iconClass: string) => void,
): void => {
  const selection = getGroupSelection(group)
  const shownSelection = useRef(selection)

  useEffect(() => {
    if (isSameSelection(shownSelection.current, selection)) return
    shownSelection.current = selection
    announce(STATS_RESET_MESSAGES[selection.kind], STATS_RESET_ICON_CLASS)
  }, [selection, announce])
}
