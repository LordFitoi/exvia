'use client'

import MapStatusView from '@/components/map/MapStatusView'
import UserMap from '@/components/map/UserMap'
import { useGeolocation } from '@/hooks/useGeolocation'
import type { GeolocationStatus } from '@/types/geolocation'

interface StatusMessage {
  title: string
  description: string
}

const WAITING_MESSAGES: Record<Exclude<GeolocationStatus, 'ready'>, StatusMessage> = {
  pending: {
    title: 'Finding your location',
    description: 'Allow location access when your browser asks, so the map can show where you are.',
  },
  denied: {
    title: 'Location is turned off',
    description: 'Allow location access for Exvia in your browser or phone settings, then reload.',
  },
  unavailable: {
    title: 'Location unavailable',
    description: 'Your position could not be determined. Check that location services are on.',
  },
}

export default function MapOverview() {
  const { status, coordinates } = useGeolocation()

  if (status === 'ready' && coordinates) return <UserMap coordinates={coordinates} />
  const { title, description } = WAITING_MESSAGES[status === 'ready' ? 'pending' : status]
  return <MapStatusView title={title} description={description} />
}
