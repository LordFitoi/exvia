'use client'

import 'mapbox-gl/dist/mapbox-gl.css'

import { useState } from 'react'

import { useFinishFreeRide } from '@/hooks/useFinishFreeRide'
import { useFreeRideMap } from '@/hooks/useFreeRideMap'
import { useHideTabBar } from '@/hooks/useHideTabBar'
import { useRideElapsed } from '@/hooks/useRideElapsed'
import { useRideSpeeds } from '@/hooks/useRideSpeeds'
import { useTrackRecorder } from '@/hooks/useTrackRecorder'
import { useWakeLock } from '@/hooks/useWakeLock'
import { MAPBOX_ACCESS_TOKEN } from '@/services/mapboxConfig'
import type { Coordinates, GeolocationState } from '@/types/geolocation'
import MapStatusView from '@/views/map/MapStatusView'
import FinishFreeRideDialog from '@/views/ride/FinishFreeRideDialog'
import RideStatsPanel from '@/views/ride/RideStatsPanel'

interface FreeRideSessionViewProps {
  /** The latest GPS reading, whose fixes make up the recorded track. */
  location: GeolocationState
  /** Where to show the rider: the street position when there is one, else the raw fix. */
  rider: Coordinates
  /** Leaves the free ride without saving, back to the picker. */
  onLeave: () => void
  /** Leaves for good, after the track and the ride were saved. */
  onSaved: () => void
}

/** A ride with no route: the rider's own track is recorded, and saved as a new route when they finish. */
export default function FreeRideSessionView({ location, rider, onLeave, onSaved }: FreeRideSessionViewProps) {
  const [startedAt] = useState(() => Date.now())
  const elapsedSeconds = useRideElapsed(startedAt, null)
  const track = useTrackRecorder(location)
  const speeds = useRideSpeeds({ speed: location.speed, fixTime: location.timestamp, isRiding: true })
  const [isFinishOpen, setIsFinishOpen] = useState(false)
  const finish = useFinishFreeRide({ track, startedAt, speeds, onSaved, onLeave })
  const { containerRef, hasLoadFailed, recenter } = useFreeRideMap({
    accessToken: MAPBOX_ACCESS_TOKEN,
    track,
    rider,
  })

  const handleKeepRiding = () => {
    finish.reset()
    setIsFinishOpen(false)
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
      <h1 className="visually-hidden">Free ride</h1>
      <div className="map">
        <div ref={containerRef} className="map-canvas"></div>
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
        canSave={finish.canSave}
        isPending={finish.isPending}
        error={finish.error}
        onKeepRiding={handleKeepRiding}
        onFinish={finish.confirm}
      />
    </main>
  )
}
