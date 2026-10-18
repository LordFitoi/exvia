'use client'

import { useGeolocation } from '@/hooks/useGeolocation'
import { useStreetPosition } from '@/hooks/useStreetPosition'
import { MAPBOX_ACCESS_TOKEN } from '@/services/mapboxConfig'
import FreeRideSessionView from '@/views/ride/FreeRideSessionView'
import FreeRideWaitingView from '@/views/ride/FreeRideWaitingView'

interface FreeRideViewProps {
  /** Leaves the free ride without saving, back to the picker. */
  onLeave: () => void
  /** Leaves for good, after the track and the ride were saved. */
  onSaved: () => void
}

/** Starts a free ride once the rider's position is known; until then it waits on a status screen. */
export default function FreeRideView({ onLeave, onSaved }: FreeRideViewProps) {
  const location = useGeolocation()
  const street = useStreetPosition({
    accessToken: MAPBOX_ACCESS_TOKEN,
    coordinates: location.coordinates,
  })
  // A fix that cannot be snapped to a street (or not yet) still shows where the rider is.
  const rider = street.coordinates ?? location.coordinates

  if (!rider) return <FreeRideWaitingView status={location.status} onClose={onLeave} />
  return <FreeRideSessionView location={location} rider={rider} onLeave={onLeave} onSaved={onSaved} />
}
