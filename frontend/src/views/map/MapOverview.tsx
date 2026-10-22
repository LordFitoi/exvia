'use client'

import { useCallback, useState } from 'react'

import Toast from '@/components/feedback/Toast'
import DestinationRideView from '@/views/map/DestinationRideView'
import RideSummariesView from '@/views/history/RideSummariesView'
import MapStatusView from '@/views/map/MapStatusView'
import UserMap from '@/views/map/UserMap'
import RouteCreatorView from '@/views/routes/RouteCreatorView'
import RouteListView from '@/views/routes/RouteListView'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useStreetPosition } from '@/hooks/useStreetPosition'
import { formatDistance, formatDuration } from '@/services/formatRoute'
import { MAPBOX_ACCESS_TOKEN } from '@/services/mapboxConfig'
import type { GeolocationStatus, StreetPositionStatus } from '@/types/geolocation'
import type { Place } from '@/types/place'
import type { SavedRoute } from '@/types/route'

interface StatusMessage {
  title: string
  description: string
}

type MapMode = 'browse' | 'create' | 'list' | 'history'

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

const describeSavedRoute = ({ name, distance, estimated_time }: SavedRoute): string =>
  `${name} saved: ${formatDistance(distance)}, about ${formatDuration(estimated_time)}`

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

  const [mode, setMode] = useState<MapMode>('browse')
  const [destination, setDestination] = useState<Place | null>(null)
  const [savedMessage, setSavedMessage] = useState<string | null>(null)

  const dismissSavedMessage = useCallback(() => setSavedMessage(null), [])

  const handleRouteSaved = (route: SavedRoute) => {
    setSavedMessage(describeSavedRoute(route))
    setMode('browse')
  }

  if (street.coordinates && destination) {
    return (
      <DestinationRideView
        key={destination.id}
        destination={destination}
        location={location}
        rider={street.coordinates}
        onQuit={() => setDestination(null)}
      />
    )
  }
  if (mode === 'history') return <RideSummariesView onClose={() => setMode('browse')} />
  if (mode === 'list') {
    return <RouteListView onClose={() => setMode('browse')} onCreateRoute={() => setMode('create')} />
  }
  if (street.coordinates && mode === 'create') {
    return (
      <RouteCreatorView
        coordinates={street.coordinates}
        onClose={() => setMode('browse')}
        onSaved={handleRouteSaved}
      />
    )
  }
  if (street.coordinates) {
    return (
      <UserMap
        coordinates={street.coordinates}
        onCreateRoute={() => setMode('create')}
        onPreviewRoutes={() => setMode('list')}
        onViewHistory={() => setMode('history')}
        onSelectPlace={setDestination}
      >
        {savedMessage && <Toast message={savedMessage} onDismiss={dismissSavedMessage} />}
      </UserMap>
    )
  }
  const { title, description } = WAITING_MESSAGES[getWaitingKey(location.status, street.status)]
  return <MapStatusView title={title} description={description} />
}
