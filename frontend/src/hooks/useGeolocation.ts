'use client'

import { Capacitor } from '@capacitor/core'
import type { Location } from '@capacitor-community/background-geolocation'
import { useEffect, useState } from 'react'

import { startBackgroundWatch } from '@/services/backgroundLocationWatch'
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

interface GeolocationOptions {
  /**
   * Keeps the position coming while the screen is locked or another app is in front. Only the native
   * app can: it runs a foreground service with a notification. In a browser it has no effect.
   */
  readonly shouldTrackInBackground?: boolean
}

type SetState = (update: (previous: GeolocationState) => GeolocationState) => void

const toReadyState = ({ coords, timestamp }: GeolocationPosition): GeolocationState => ({
  status: 'ready',
  coordinates: { longitude: coords.longitude, latitude: coords.latitude },
  timestamp,
  speed: coords.speed,
  accuracy: coords.accuracy,
})

const toReadyStateFromLocation = (location: Location): GeolocationState => ({
  status: 'ready',
  coordinates: { longitude: location.longitude, latitude: location.latitude },
  timestamp: location.time,
  speed: location.speed,
  accuracy: location.accuracy,
})

// A timeout or a lost signal after a first fix keeps the last known position on screen.
const toErrorState = (isDenied: boolean, previous: GeolocationState): GeolocationState => {
  if (isDenied) return DENIED_STATE
  return previous.coordinates ? previous : UNAVAILABLE_STATE
}

const isGeolocationSupported = (): boolean =>
  typeof navigator !== 'undefined' && 'geolocation' in navigator

const startWebWatch = (setState: SetState): (() => void) => {
  const startWatch = () =>
    navigator.geolocation.watchPosition(
      (position) => setState(() => toReadyState(position)),
      (error) =>
        setState((previous) => toErrorState(error.code === error.PERMISSION_DENIED, previous)),
      WATCH_OPTIONS,
    )
  let watchId = startWatch()
  // Browsers may end a watch while the app is hidden, so it is registered again on coming back.
  const handleVisibilityChange = () => {
    if (document.visibilityState !== 'visible') return
    navigator.geolocation.clearWatch(watchId)
    watchId = startWatch()
  }
  document.addEventListener('visibilitychange', handleVisibilityChange)
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    navigator.geolocation.clearWatch(watchId)
  }
}

const startNativeWatch = (setState: SetState): (() => void) =>
  startBackgroundWatch({
    onLocation: (location) => setState(() => toReadyStateFromLocation(location)),
    onFailure: (isDenied) => setState((previous) => toErrorState(isDenied, previous)),
  })

export const useGeolocation = ({
  shouldTrackInBackground = false,
}: GeolocationOptions = {}): GeolocationState => {
  const [state, setState] = useState<GeolocationState>(PENDING_STATE)
  const isSupported = isGeolocationSupported()

  useEffect(() => {
    if (!isSupported) return
    const isNativeBackground = shouldTrackInBackground && Capacitor.isNativePlatform()
    return isNativeBackground ? startNativeWatch(setState) : startWebWatch(setState)
  }, [isSupported, shouldTrackInBackground])

  return isSupported ? state : UNAVAILABLE_STATE
}
