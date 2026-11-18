'use client'

import { useCallback, useEffect, useRef } from 'react'

import type { ConnectionStatus } from '@/services/groupConnection'
import type { Coordinates, GeolocationState } from '@/types/geolocation'

export const POSITION_INTERVAL_MS = 4000
const KMH_PER_METER_PER_SECOND = 3.6

interface SharePositionOptions {
  send: (message: object) => void
  status: ConnectionStatus
  /** Where the rider is shown, or null while it is unknown. */
  rider: Coordinates | null
  /** The GPS reading, for the speed and the accuracy. */
  location: GeolocationState
}

/**
 * Sends the rider's latest position to the group when the channel opens and every 4 seconds after. A new fix
 * also sends when the last report is older than that: the GPS keeps delivering while the app is hidden,
 * and the timer alone may be throttled then.
 */
export const useSharePosition = ({ send, status, rider, location }: SharePositionOptions): void => {
  const latestRef = useRef({ rider, location })
  const lastSentAtRef = useRef(0)

  useEffect(() => {
    latestRef.current = { rider, location }
  }, [rider, location])

  const share = useCallback(() => {
    const { rider: current, location: reading } = latestRef.current
    if (!current) return
    lastSentAtRef.current = Date.now()
    send({
      type: 'position',
      lng: current.longitude,
      lat: current.latitude,
      speed: reading.speed === null ? null : reading.speed * KMH_PER_METER_PER_SECOND,
      accuracy: reading.accuracy,
    })
  }, [send])

  useEffect(() => {
    if (status !== 'open') return
    // Timers run slowly or not at all while the app is hidden, so coming back reports without waiting.
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') share()
    }
    share()
    const timer = setInterval(share, POSITION_INTERVAL_MS)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [status, share])

  useEffect(() => {
    if (status !== 'open') return
    if (Date.now() - lastSentAtRef.current >= POSITION_INTERVAL_MS) share()
  }, [status, rider, location, share])
}
