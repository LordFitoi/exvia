'use client'

import { useMemo } from 'react'

import { useGroupChannel } from '@/hooks/useGroupChannel'
import { useNow } from '@/hooks/useNow'
import { usePresenceNotice } from '@/hooks/usePresenceNotice'
import type { PresenceNotice } from '@/hooks/usePresenceNotice'
import { POSITION_INTERVAL_MS, useSharePosition } from '@/hooks/useSharePosition'
import { buildRiderMarkers } from '@/services/riderMarkers'
import type { RiderMarkerData } from '@/services/riderMarkers'
import type { Coordinates, GeolocationState } from '@/types/geolocation'
import type { RouteGroup } from '@/types/routeGroup'

interface GroupRideOptions {
  group: RouteGroup
  rider: Coordinates | null
  location: GeolocationState
}

interface GroupRide {
  /** The other riders who reported recently, to draw on the map. */
  readonly riders: readonly RiderMarkerData[]
  /** The latest rider to join or leave the group, until dismissed. */
  readonly notice: PresenceNotice | null
  readonly dismissNotice: () => void
}

/** Shares the rider's position with their group and returns where the other riders are, and who came or went. */
export const useGroupRide = ({ group, rider, location }: GroupRideOptions): GroupRide => {
  const presence = usePresenceNotice(group.participants)
  const { status, positions, send } = useGroupChannel(group.id, presence.handlePresence)
  useSharePosition({ send, status, rider, location })
  // Riders drop off the map when their reports stop, so staleness is checked as often as they report.
  const now = useNow(POSITION_INTERVAL_MS)

  const riders = useMemo(
    () => buildRiderMarkers(group.participants, positions, now),
    [group.participants, positions, now],
  )

  return { riders, notice: presence.notice, dismissNotice: presence.dismiss }
}
