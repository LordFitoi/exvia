'use client'

import { useState } from 'react'

import type { GroupRide } from '@/hooks/useGroupRide'
import { useRideMaxSpeed } from '@/hooks/useRideMaxSpeed'
import { useTrackRecorder } from '@/hooks/useTrackRecorder'
import type { Coordinates, GeolocationState } from '@/types/geolocation'
import type { TrackPoint } from '@/types/track'
import FinishTrackSheet from '@/views/ride/FinishTrackSheet'
import FollowRideScreen from '@/views/ride/FollowRideScreen'

interface FinishRequest {
  /** When the rider asked to finish, in milliseconds since the epoch. */
  readonly endedAt: number
  /** The path as it was then; the ride goes on recording while the sheet is open. */
  readonly track: readonly TrackPoint[]
  readonly kilometres: number
}

interface TrackRideSessionViewProps {
  groupId: string
  location: GeolocationState
  /** Where to show the rider: the street position when there is one, else the raw fix. */
  rider: Coordinates
  /** The group channel: the other riders and the notice of who came or went. */
  groupRide: GroupRide
  /** Leaves the ride, back to the map. */
  onLeave: () => void
}

/**
 * A free ride that records the path ridden. Finishing turns the path into a route, "Track" and the day, and
 * saves the ride on it in the history ([FinishTrackSheet]).
 */
export default function TrackRideSessionView({ groupId, location, rider, groupRide, onLeave }: TrackRideSessionViewProps) {
  const [startedAt] = useState(() => Date.now())
  const maxSpeed = useRideMaxSpeed({ speed: location.speed, fixTime: location.timestamp, isRiding: true })
  const { points, kilometres } = useTrackRecorder(rider, location.timestamp)
  const [finish, setFinish] = useState<FinishRequest | null>(null)

  return (
    <FollowRideScreen
      title="Track ride"
      location={location}
      rider={rider}
      groupRide={groupRide}
      startedAt={startedAt}
      maxSpeed={maxSpeed}
      coveredKilometres={kilometres}
      isTrack
      finishLabel="Finish track"
      onFinish={() => setFinish({ endedAt: Date.now(), track: points, kilometres })}
    >
      {finish && (
        <FinishTrackSheet
          groupId={groupId}
          track={finish.track}
          startedAt={startedAt}
          endedAt={finish.endedAt}
          maxSpeed={maxSpeed}
          kilometres={finish.kilometres}
          onKeepRiding={() => setFinish(null)}
          onLeave={onLeave}
        />
      )}
    </FollowRideScreen>
  )
}
