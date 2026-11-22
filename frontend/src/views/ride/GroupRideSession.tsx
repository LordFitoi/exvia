'use client'

import { useGeolocation } from '@/hooks/useGeolocation'
import { useGroupRide } from '@/hooks/useGroupRide'
import { useLiveGroup } from '@/hooks/useLiveGroup'
import { useStreetPosition } from '@/hooks/useStreetPosition'
import { MAPBOX_ACCESS_TOKEN } from '@/services/mapboxConfig'
import FreeRideSessionView from '@/views/ride/FreeRideSessionView'
import FreeRideWaitingView from '@/views/ride/FreeRideWaitingView'
import RideModeView from '@/views/ride/RideModeView'
import TrackRideSessionView from '@/views/ride/TrackRideSessionView'

interface GroupRideSessionProps {
  /** Leaves the ride and the group. */
  onLeave: () => void
}

/**
 * The part of a group ride that outlives the route: the GPS and the live channel. The leader can change the
 * route at any moment, and the ride screen below follows it without the rider leaving and rejoining the channel.
 * A group with no route rides free, or records its track when it is a track group.
 */
export default function GroupRideSession({ onLeave }: GroupRideSessionProps) {
  const { group } = useLiveGroup()
  const location = useGeolocation({ shouldTrackInBackground: true })
  const street = useStreetPosition({
    accessToken: MAPBOX_ACCESS_TOKEN,
    coordinates: location.coordinates,
  })
  // A fix that cannot be snapped to a street (or not yet) still shows where the rider is.
  const rider = street.coordinates ?? location.coordinates
  const groupRide = useGroupRide({ rider, location })

  // A new route is a new ride: the key starts its clock, speeds and map over.
  if (group.route) {
    return (
      <RideModeView
        key={group.route.id}
        route={group.route}
        location={location}
        rider={rider}
        groupRide={groupRide}
        onQuit={onLeave}
      />
    )
  }
  if (!rider) {
    return (
      <FreeRideWaitingView
        title={group.isTrack ? 'Track ride' : 'Free ride'}
        status={location.status}
        onClose={onLeave}
      />
    )
  }
  if (group.isTrack) {
    return (
      <TrackRideSessionView
        groupId={group.id}
        location={location}
        rider={rider}
        groupRide={groupRide}
        onLeave={onLeave}
      />
    )
  }
  return <FreeRideSessionView location={location} rider={rider} groupRide={groupRide} onLeave={onLeave} />
}
