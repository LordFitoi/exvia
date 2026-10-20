'use client'

import { useCallback, useEffect, useMemo } from 'react'

import { useAuth } from '@/hooks/useAuth'
import { useGroupChannel } from '@/hooks/useGroupChannel'
import type { PresenceHandler } from '@/hooks/useGroupChannel'
import { useLiveGroup } from '@/hooks/useLiveGroup'
import { useNow } from '@/hooks/useNow'
import { usePresenceNotice } from '@/hooks/usePresenceNotice'
import type { PresenceNotice } from '@/hooks/usePresenceNotice'
import { POSITION_INTERVAL_MS, useSharePosition } from '@/hooks/useSharePosition'
import { buildRiderMarkers } from '@/services/riderMarkers'
import type { RiderMarkerData } from '@/services/riderMarkers'
import type { Coordinates, GeolocationState } from '@/types/geolocation'

interface GroupRideOptions {
  rider: Coordinates | null
  location: GeolocationState
}

export interface GroupRide {
  /** The other riders who reported recently, to draw on the map. */
  readonly riders: readonly RiderMarkerData[]
  /** The latest rider to join or leave the group, until dismissed. */
  readonly notice: PresenceNotice | null
  readonly dismissNotice: () => void
}

const LOST_PLACE_MESSAGE = 'You are no longer in this ride'
const describeRouteChange = (leaderName: string): string => `${leaderName} changed the route`
const describeLeaderChange = (leaderName: string | null, isYou: boolean): string =>
  isYou ? 'You lead the ride now' : `${leaderName ?? 'Another rider'} leads the ride now`

/**
 * Shares the rider's position with their group and returns where the other riders are, and who came or went.
 * Whenever a rider joins or leaves the group is read again, so riders invited or removed meanwhile show up;
 * so it is when the leader changes the route, which the ride screen then follows, or hands the group to
 * another rider, whose controls then show.
 */
export const useGroupRide = ({ rider, location }: GroupRideOptions): GroupRide => {
  const { user } = useAuth()
  const { group, reloadGroup } = useLiveGroup()
  const presence = usePresenceNotice(group.participants)
  const { handlePresence: announcePresence, announce } = presence
  const handlePresence = useCallback<PresenceHandler>(
    (userId, presenceStatus) => {
      announcePresence(userId, presenceStatus)
      reloadGroup()
    },
    [announcePresence, reloadGroup],
  )
  const leaderName = group.author.username
  const handleRouteChange = useCallback(() => {
    announce(describeRouteChange(leaderName))
    reloadGroup()
  }, [announce, leaderName, reloadGroup])
  const { participants } = group
  const userId = user?.id
  const handleLeaderChange = useCallback(
    (leaderId: number) => {
      const leaderName = participants.find(({ id }) => id === leaderId)?.username ?? null
      announce(describeLeaderChange(leaderName, leaderId === userId))
      reloadGroup()
    },
    [announce, participants, userId, reloadGroup],
  )
  const channelHandlers = useMemo(
    () => ({ onPresence: handlePresence, onRouteChange: handleRouteChange, onLeaderChange: handleLeaderChange }),
    [handlePresence, handleRouteChange, handleLeaderChange],
  )
  const { status, positions, send } = useGroupChannel(group.id, channelHandlers)
  useEffect(() => {
    if (status === 'denied') announce(LOST_PLACE_MESSAGE)
  }, [status, announce])
  useSharePosition({ send, status, rider, location })
  // Riders drop off the map when their reports stop, so staleness is checked as often as they report.
  const now = useNow(POSITION_INTERVAL_MS)

  const riders = useMemo(
    () => buildRiderMarkers(group.participants, positions, now),
    [group.participants, positions, now],
  )

  return { riders, notice: presence.notice, dismissNotice: presence.dismiss }
}
