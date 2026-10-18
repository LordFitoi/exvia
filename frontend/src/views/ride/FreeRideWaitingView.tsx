'use client'

import StateView from '@/components/feedback/StateView'
import { useHideTabBar } from '@/hooks/useHideTabBar'
import type { GeolocationStatus } from '@/types/geolocation'

interface WaitingMessage {
  title: string
  description: string
}

const FINDING_LOCATION_MESSAGE: WaitingMessage = {
  title: 'Finding your location',
  description: 'Allow location access when your browser asks. The ride starts once you have a position.',
}

const WAITING_MESSAGES: Record<GeolocationStatus, WaitingMessage> = {
  pending: FINDING_LOCATION_MESSAGE,
  ready: FINDING_LOCATION_MESSAGE,
  denied: {
    title: 'Location is turned off',
    description:
      'A free ride records where you go. Allow location access for Exvia in your browser or phone settings, then try again.',
  },
  unavailable: {
    title: 'Location unavailable',
    description: 'Your position could not be determined. Check that location services are on.',
  },
}

interface FreeRideWaitingViewProps {
  status: GeolocationStatus
  /** Goes back to the route picker. */
  onClose: () => void
}

/** Shown until the first GPS fix arrives: a free ride cannot start without knowing where the rider is. */
export default function FreeRideWaitingView({ status, onClose }: FreeRideWaitingViewProps) {
  useHideTabBar(true)
  const { title, description } = WAITING_MESSAGES[status]

  return (
    <main className="screen-body">
      <div className="screen-header">
        <h1 className="text-heading">Free ride</h1>
        <button className="icon-button" type="button" aria-label="Close" onClick={onClose}>
          <span className="icon icon-x" aria-hidden="true"></span>
        </button>
      </div>
      <StateView title={title} description={description}>
        <span className="icon icon-lg icon-locate"></span>
      </StateView>
    </main>
  )
}
