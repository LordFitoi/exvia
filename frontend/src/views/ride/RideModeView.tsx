'use client'

import 'mapbox-gl/dist/mapbox-gl.css'

import { useState } from 'react'

import Toast from '@/components/feedback/Toast'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useGroupRide } from '@/hooks/useGroupRide'
import { useHideTabBar } from '@/hooks/useHideTabBar'
import { useQuitRide } from '@/hooks/useQuitRide'
import { useRideArrival } from '@/hooks/useRideArrival'
import { useRideElapsed } from '@/hooks/useRideElapsed'
import { useRideLines } from '@/hooks/useRideLines'
import { useRideMap } from '@/hooks/useRideMap'
import { useRideProgress } from '@/hooks/useRideProgress'
import { useRideSpeeds } from '@/hooks/useRideSpeeds'
import { useSaveRideSummary } from '@/hooks/useSaveRideSummary'
import { useStreetPosition } from '@/hooks/useStreetPosition'
import { useWakeLock } from '@/hooks/useWakeLock'
import { MAPBOX_ACCESS_TOKEN } from '@/services/mapboxConfig'
import MapStatusView from '@/views/map/MapStatusView'
import ConfirmQuitRideDialog from '@/views/ride/ConfirmQuitRideDialog'
import RideStatsPanel from '@/views/ride/RideStatsPanel'
import RideSummarySheet from '@/views/ride/RideSummarySheet'
import type { RideRoute } from '@/types/route'
import type { RouteGroup } from '@/types/routeGroup'

interface RideModeViewProps {
  route: RideRoute
  /** The group riding this route; its other riders are shown on the map. */
  group: RouteGroup
  /** Leaves ride mode for the picker, with the route still selected. */
  onQuit: () => void
  /** Leaves ride mode for good, after the summary of a finished ride. */
  onFinish: () => void
}

export default function RideModeView({ route, group, onQuit, onFinish }: RideModeViewProps) {
  const location = useGeolocation()
  const street = useStreetPosition({
    accessToken: MAPBOX_ACCESS_TOKEN,
    coordinates: location.coordinates,
  })
  // A fix that cannot be snapped to a street (or not yet) still shows where the rider is.
  const rider = street.coordinates ?? location.coordinates
  const { riders, notice, dismissNotice } = useGroupRide({ group, rider, location })
  const progress = useRideProgress({ path: route.points, rider })
  const lines = useRideLines({
    accessToken: MAPBOX_ACCESS_TOKEN,
    path: route.points,
    progress,
    rider,
  })
  const arrivedAt = useRideArrival({ progress, fixTime: location.timestamp })
  const [startedAt] = useState(() => Date.now())
  const elapsedSeconds = useRideElapsed(startedAt, arrivedAt)
  const speeds = useRideSpeeds({
    speed: location.speed,
    fixTime: location.timestamp,
    isRiding: arrivedAt === null,
  })
  const save = useSaveRideSummary({ routeId: route.id, startedAt, endedAt: arrivedAt, speeds })
  const [isSummaryDismissed, setIsSummaryDismissed] = useState(false)
  const [isQuitConfirmOpen, setIsQuitConfirmOpen] = useState(false)
  const quit = useQuitRide({ routeId: route.id, startedAt, speeds, onQuit })
  const { containerRef, hasLoadFailed, recenter } = useRideMap({
    accessToken: MAPBOX_ACCESS_TOKEN,
    path: route.points,
    lines,
    rider,
    riders,
  })

  // Once the ride is finished it is already saved, so the X leaves at once.
  const handleCloseClick = () => (arrivedAt === null ? setIsQuitConfirmOpen(true) : onQuit())

  const handleKeepRiding = () => {
    quit.reset()
    setIsQuitConfirmOpen(false)
  }

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
      {notice && (
        <div className="toast-region">
          <Toast key={notice.id} message={notice.message} iconClass="icon-users" onDismiss={dismissNotice} />
        </div>
      )}
      <div className="map">
        <div ref={containerRef} className="map-canvas"></div>
        <div className="map-overlay">
          <div className="map-controls">
            <button className="icon-button" type="button" aria-label="Quit ride" onClick={handleCloseClick}>
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
      <ConfirmQuitRideDialog
        isOpen={isQuitConfirmOpen}
        isPending={quit.isPending}
        error={quit.error}
        onKeepRiding={handleKeepRiding}
        onQuit={quit.confirm}
      />
      {arrivedAt !== null && (
        <RideSummarySheet
          isOpen={!isSummaryDismissed}
          route={route}
          rideSeconds={elapsedSeconds}
          saveStatus={save.status}
          onRetrySave={save.retry}
          onClose={() => setIsSummaryDismissed(true)}
          onDone={onFinish}
        />
      )}
    </main>
  )
}
