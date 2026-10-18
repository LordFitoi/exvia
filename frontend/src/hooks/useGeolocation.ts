'use client'

import { useEffect, useState } from 'react'

import type { GeolocationState } from '@/types/geolocation'

const WATCH_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 10_000,
  timeout: 20_000,
}

const NO_FIX = { coordinates: null, timestamp: null, speed: null, accuracy: null } as const
const PENDING_STATE: GeolocationState = { status: 'pending', ...NO_FIX }
const DENIED_STATE: GeolocationState = { status: 'denied', ...NO_FIX }
const UNAVAILABLE_STATE: GeolocationState = { status: 'unavailable', ...NO_FIX }

const toReadyState = ({ coords, timestamp }: GeolocationPosition): GeolocationState => ({
  status: 'ready',
  coordinates: { longitude: coords.longitude, latitude: coords.latitude },
  timestamp,
  speed: coords.speed,
  accuracy: coords.accuracy,
})

// A timeout or a lost signal after a first fix keeps the last known position on screen.
const toErrorState = (
  error: GeolocationPositionError,
  previous: GeolocationState,
): GeolocationState => {
  if (error.code === error.PERMISSION_DENIED) return DENIED_STATE
  return previous.coordinates ? previous : UNAVAILABLE_STATE
}

const isGeolocationSupported = (): boolean =>
  typeof navigator !== 'undefined' && 'geolocation' in navigator

export const useGeolocation = (): GeolocationState => {
  const [state, setState] = useState<GeolocationState>(PENDING_STATE)
  const isSupported = isGeolocationSupported()

  useEffect(() => {
    if (!isSupported) return
    const watchId = navigator.geolocation.watchPosition(
      (position) => setState(toReadyState(position)),
      (error) => setState((previous) => toErrorState(error, previous)),
      WATCH_OPTIONS,
    )
    return () => navigator.geolocation.clearWatch(watchId)
  }, [isSupported])

  return isSupported ? state : UNAVAILABLE_STATE
}
