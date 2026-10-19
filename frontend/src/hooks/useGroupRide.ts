'use client'

import { useMemo } from 'react'

import { useGroupChannel } from '@/hooks/useGroupChannel'
import { useNow } from '@/hooks/useNow'
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

/** Shares the rider's position with their group and returns where the other riders are. */
export const useGroupRide = ({ group, rider, location }: GroupRideOptions): readonly RiderMarkerData[] => {
  const { status, positions, send } = useGroupChannel(group.id)
  useSharePosition({ send, status, rider, location })
  // Riders drop off the map when their reports stop, so staleness is checked as often as they report.
  const now = useNow(POSITION_INTERVAL_MS)

  return useMemo(
    () => buildRiderMarkers(group.participants, positions, now),
    [group.participants, positions, now],
  )
}
