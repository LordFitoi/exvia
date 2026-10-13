'use client'

import MapStatusView from '@/views/map/MapStatusView'
import UserMap from '@/views/map/UserMap'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useStreetPosition } from '@/hooks/useStreetPosition'
import { MAPBOX_ACCESS_TOKEN } from '@/services/mapboxConfig'
import type { GeolocationStatus, StreetPositionStatus } from '@/types/geolocation'

interface StatusMessage {
  title: string
  description: string
}

type WaitingKey = Exclude<GeolocationStatus, 'ready'> | Exclude<StreetPositionStatus, 'ready'>

const FINDING_LOCATION_MESSAGE: StatusMessage = {
  title: 'Finding your location',
  description: 'Allow location access when your browser asks, so the map can show where you are.',
}

const WAITING_MESSAGES: Record<WaitingKey, StatusMessage> = {
  pending: FINDING_LOCATION_MESSAGE,
  snapping: FINDING_LOCATION_MESSAGE,
  denied: {
    title: 'Location is turned off',
    description: 'Allow location access for Exvia in your browser or phone settings, then reload.',
  },
  unavailable: {
    title: 'Location unavailable',
    description: 'Your position could not be determined. Check that location services are on.',
  },
  'off-street': {
    title: 'Get on a street',
    description: 'You are not near a street. The map shows you once you are on one.',
  },
  failed: {
    title: 'Street not found',
    description: 'Your position could not be matched to a street. Check your connection and try again.',
  },
}

const getWaitingKey = (
  locationStatus: GeolocationStatus,
  streetStatus: StreetPositionStatus,
): WaitingKey => {
  if (locationStatus !== 'ready') return locationStatus
  return streetStatus === 'ready' ? 'snapping' : streetStatus
}

export default function MapOverview() {
  const location = useGeolocation()
  const street = useStreetPosition({
    accessToken: MAPBOX_ACCESS_TOKEN,
    coordinates: location.coordinates,
  })

  if (street.coordinates) return <UserMap coordinates={street.coordinates} />
  const { title, description } = WAITING_MESSAGES[getWaitingKey(location.status, street.status)]
  return <MapStatusView title={title} description={description} />
}
