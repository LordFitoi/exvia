'use client'

import 'mapbox-gl/dist/mapbox-gl.css'

import { useState } from 'react'

import Toast from '@/components/feedback/Toast'
import { useFreeRideMap } from '@/hooks/useFreeRideMap'
import type { GroupRide } from '@/hooks/useGroupRide'
import { useHideTabBar } from '@/hooks/useHideTabBar'
import { useRideElapsed } from '@/hooks/useRideElapsed'
import { useWakeLock } from '@/hooks/useWakeLock'
import { MAPBOX_ACCESS_TOKEN } from '@/services/mapboxConfig'
import type { Coordinates, GeolocationState } from '@/types/geolocation'
import MapStatusView from '@/views/map/MapStatusView'
import ChangeRouteControl from '@/views/ride/ChangeRouteControl'
import FinishFreeRideDialog from '@/views/ride/FinishFreeRideDialog'
import EdgeIndicators from '@/views/ride/EdgeIndicators'
import RidersControl from '@/views/ride/RidersControl'
import RideStatsPanel from '@/views/ride/RideStatsPanel'

interface FreeRideSessionViewProps {
  /** The latest GPS reading, whose fixes make up the recorded track. */
  location: GeolocationState
  /** Where to show the rider: the street position when there is one, else the raw fix. */
  rider: Coordinates
  /** The group channel: the other riders and the notice of who came or went. */
  groupRide: GroupRide
  /** Leaves the free ride, back to the picker. */
  onLeave: () => void
}

/** A ride with no route: nothing of it is drawn or recorded, only the rider and the group are on the map. */
export default function FreeRideSessionView({ location, rider, groupRide, onLeave }: FreeRideSessionViewProps) {
  const [startedAt] = useState(() => Date.now())
  const elapsedSeconds = useRideElapsed(startedAt, null)
  const { riders, notice, dismissNotice } = groupRide
  const [isFinishOpen, setIsFinishOpen] = useState(false)
  const { containerRef, hasLoadFailed, recenter, focusOn, indicators } = useFreeRideMap({
    accessToken: MAPBOX_ACCESS_TOKEN,
    rider,
    riders,
  })

  const handleKeepRiding = () => setIsFinishOpen(false)

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
      <h1 className="visually-hidden">Free ride</h1>
      {notice && (
        <div className="toast-region">
          <Toast key={notice.id} message={notice.message} iconClass={notice.iconClass} onDismiss={dismissNotice} />
        </div>
      )}
      <div className="map">
        <div ref={containerRef} className="map-canvas"></div>
        <EdgeIndicators indicators={indicators} />
        <div className="map-overlay">
          <div className="map-controls">
            <button
              className="icon-button"
              type="button"
              aria-label="Finish ride"
              onClick={() => setIsFinishOpen(true)}
            >
              <span className="icon icon-flag-checkered" aria-hidden="true"></span>
            </button>
            <RidersControl riders={riders} onFocus={focusOn} />
            <ChangeRouteControl rider={rider} />
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
      <FinishFreeRideDialog
        isOpen={isFinishOpen}
        onKeepRiding={handleKeepRiding}
        onFinish={onLeave}
      />
    </main>
  )
}
