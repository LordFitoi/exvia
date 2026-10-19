'use client'

import { useEffect, useRef } from 'react'

import type { ConnectionStatus } from '@/services/groupConnection'
import type { Coordinates, GeolocationState } from '@/types/geolocation'

export const POSITION_INTERVAL_MS = 5000
const KMH_PER_METER_PER_SECOND = 3.6

interface SharePositionOptions {
  send: (message: object) => void
  status: ConnectionStatus
  /** Where the rider is shown, or null while it is unknown. */
  rider: Coordinates | null
  /** The GPS reading, for the speed and the accuracy. */
  location: GeolocationState
}

/** Sends the rider's latest position to the group when the channel opens and every 5 seconds after. */
export const useSharePosition = ({ send, status, rider, location }: SharePositionOptions): void => {
  const latestRef = useRef({ rider, location })

  useEffect(() => {
    latestRef.current = { rider, location }
  }, [rider, location])

  useEffect(() => {
    if (status !== 'open') return
    const share = () => {
      const { rider: current, location: reading } = latestRef.current
      if (!current) return
      send({
        type: 'position',
        lng: current.longitude,
        lat: current.latitude,
        speed: reading.speed === null ? null : reading.speed * KMH_PER_METER_PER_SECOND,
        accuracy: reading.accuracy,
      })
    }
    share()
    const timer = setInterval(share, POSITION_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [status, send])
}
