'use client'

import { useEffect, useState } from 'react'

import { snapToStreet } from '@/services/streetSnapApi'
import type { Coordinates, StreetPositionState } from '@/types/geolocation'

interface StreetPositionOptions {
  accessToken: string | undefined
  coordinates: Coordinates | null
}

const SNAPPING_STATE: StreetPositionState = { status: 'snapping', coordinates: null }
const FAILED_STATE: StreetPositionState = { status: 'failed', coordinates: null }

// Off-street fixes and failed lookups keep the last street position, so the marker never
// leaves the road network.
export const useStreetPosition = ({
  accessToken,
  coordinates,
}: StreetPositionOptions): StreetPositionState => {
  const [state, setState] = useState<StreetPositionState>(SNAPPING_STATE)
  const latitude = coordinates?.latitude
  const longitude = coordinates?.longitude

  useEffect(() => {
    if (!accessToken || latitude === undefined || longitude === undefined) return

    const controller = new AbortController()
    const snap = async () => {
      try {
        const street = await snapToStreet(
          { latitude, longitude },
          { accessToken, signal: controller.signal },
        )
        setState((previous) =>
          street
            ? { status: 'ready', coordinates: street }
            : { status: 'off-street', coordinates: previous.coordinates },
        )
      } catch (error) {
        if (controller.signal.aborted) return
        console.error('Could not match the position to a street', error)
        setState((previous) => ({ status: 'failed', coordinates: previous.coordinates }))
      }
    }
    snap()
    return () => controller.abort()
  }, [accessToken, latitude, longitude])

  if (!accessToken) return FAILED_STATE
  if (latitude === undefined) return SNAPPING_STATE
  return state
}
