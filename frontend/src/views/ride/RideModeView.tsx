'use client'

import 'mapbox-gl/dist/mapbox-gl.css'

import { useState } from 'react'

import { useGeolocation } from '@/hooks/useGeolocation'
import { useHideTabBar } from '@/hooks/useHideTabBar'
import { useRideArrival } from '@/hooks/useRideArrival'
import { useRideElapsed } from '@/hooks/useRideElapsed'
import { useRideLines } from '@/hooks/useRideLines'
import { useRideMap } from '@/hooks/useRideMap'
import { useRideProgress } from '@/hooks/useRideProgress'
import { useStreetPosition } from '@/hooks/useStreetPosition'
import { useWakeLock } from '@/hooks/useWakeLock'
import { MAPBOX_ACCESS_TOKEN } from '@/services/mapboxConfig'
import MapStatusView from '@/views/map/MapStatusView'
import RideStatsPanel from '@/views/ride/RideStatsPanel'
import RideSummarySheet from '@/views/ride/RideSummarySheet'
import type { RouteDetail } from '@/types/route'

interface RideModeViewProps {
  route: RouteDetail
  /** Leaves ride mode for the picker, with the route still selected. */
  onQuit: () => void
  /** Leaves ride mode for good, after the summary of a finished ride. */
  onFinish: () => void
}

export default function RideModeView({ route, onQuit, onFinish }: RideModeViewProps) {
  const location = useGeolocation()
  const street = useStreetPosition({
    accessToken: MAPBOX_ACCESS_TOKEN,
    coordinates: location.coordinates,
  })
  // A fix that cannot be snapped to a street (or not yet) still shows where the rider is.
  const rider = street.coordinates ?? location.coordinates
  const progress = useRideProgress({ path: route.points, rider })
  const lines = useRideLines({
    accessToken: MAPBOX_ACCESS_TOKEN,
    path: route.points,
    progress,
    rider,
  })
  const arrivedAt = useRideArrival({ progress, fixTime: location.timestamp })
  const elapsedSeconds = useRideElapsed(arrivedAt)
  const [isSummaryDismissed, setIsSummaryDismissed] = useState(false)
  const { containerRef, hasLoadFailed, recenter } = useRideMap({
    accessToken: MAPBOX_ACCESS_TOKEN,
    path: route.points,
    lines,
    rider,
  })

  // The load-failure screen has no way out of its own, so it keeps the tab bar.
  useHideTabBar(!hasLoadFailed)
  useWakeLock(!hasLoadFailed)

  if (hasLoadFailed) {
    return (
      <MapStatusView
        title="Map unavailable"
        description="The map could not be loaded. Check your connection and try again later."
      />
    )
  }

  return (
    <main className="ride-screen">
      <h1 className="visually-hidden">Riding {route.name}</h1>
      <div className="map">
        <div ref={containerRef} className="map-canvas"></div>
        <div className="map-overlay">
          <div className="map-controls">
            <button className="icon-button" type="button" aria-label="Quit ride" onClick={onQuit}>
              <span className="icon icon-x" aria-hidden="true"></span>
            </button>
          </div>
        </div>
        <button
          className="icon-button icon-button-primary map-control-bottom-center"
          type="button"
          aria-label="Center on my location"
          onClick={recenter}
        >
          <span className="icon icon-locate" aria-hidden="true"></span>
        </button>
      </div>
      <RideStatsPanel elapsedSeconds={elapsedSeconds} speed={location.speed} />
      {arrivedAt !== null && (
        <RideSummarySheet
          isOpen={!isSummaryDismissed}
          route={route}
          rideSeconds={elapsedSeconds}
          onClose={() => setIsSummaryDismissed(true)}
          onDone={onFinish}
        />
      )}
    </main>
  )
}
