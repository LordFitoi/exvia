'use client'

import { useState } from 'react'

import type { GroupRide } from '@/hooks/useGroupRide'
import { useRideMaxSpeed } from '@/hooks/useRideMaxSpeed'
import type { Coordinates, GeolocationState } from '@/types/geolocation'
import FinishFreeRideDialog from '@/views/ride/FinishFreeRideDialog'
import FollowRideScreen from '@/views/ride/FollowRideScreen'

interface FreeRideSessionViewProps {
  location: GeolocationState
  /** Where to show the rider: the street position when there is one, else the raw fix. */
  rider: Coordinates
  /** The group channel: the other riders and the notice of who came or went. */
  groupRide: GroupRide
  /** Leaves the free ride, back to the picker. */
  onLeave: () => void
}

/** A ride with no route: nothing of it is drawn or recorded, only the rider and the group are on the map. */
export default function FreeRideSessionView({ location, rider, groupRide, onLeave }: FreeRideSessionViewProps) {
  const [startedAt] = useState(() => Date.now())
  const maxSpeed = useRideMaxSpeed({ speed: location.speed, fixTime: location.timestamp, isRiding: true })
  const [isFinishOpen, setIsFinishOpen] = useState(false)

  return (
    <FollowRideScreen
      title="Free ride"
      location={location}
      rider={rider}
      groupRide={groupRide}
      startedAt={startedAt}
      maxSpeed={maxSpeed}
      coveredKilometres={0}
      finishLabel="Finish ride"
      onFinish={() => setIsFinishOpen(true)}
    >
      <FinishFreeRideDialog isOpen={isFinishOpen} onKeepRiding={() => setIsFinishOpen(false)} onFinish={onLeave} />
    </FollowRideScreen>
  )
}
