'use client'

import 'mapbox-gl/dist/mapbox-gl.css'

import type { ReactNode } from 'react'

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
import EdgeIndicators from '@/views/ride/EdgeIndicators'
import RidersControl from '@/views/ride/RidersControl'
import RideStatsPanel from '@/views/ride/RideStatsPanel'

interface FollowRideScreenProps {
  /** The name of the screen for screen readers. */
  title: string
  /** The latest GPS reading, whose speed and fix time make up the ride's stats. */
  location: GeolocationState
  /** Where to show the rider: the street position when there is one, else the raw fix. */
  rider: Coordinates
  /** The group channel: the other riders and the notice of who came or went. */
  groupRide: GroupRide
  /** When the ride began, in milliseconds since the epoch. */
  startedAt: number
  /** The top speed of the ride so far in km/h, or null when the device gave none. */
  maxSpeed: number | null
  /** The kilometres ridden so far, for the average speed; a ride that records its path also shows them. */
  coveredKilometres: number
  isTrack?: boolean
  /** What the finish button is called, such as "Finish ride". */
  finishLabel: string
  /** The finish button was pressed. */
  onFinish: () => void
  /** The dialogs of the ride, which the finish button opens. */
  children?: ReactNode
}

/**
 * The screen of a ride with no route: the pitched 3D map that follows the rider, the stats strip and the
 * group, with a flag button to finish. What finishing does is up to the ride (`onFinish` and its dialogs).
 */
export default function FollowRideScreen({
  title,
  location,
  rider,
  groupRide,
  startedAt,
  maxSpeed,
  coveredKilometres,
  isTrack = false,
  finishLabel,
  onFinish,
  children,
}: FollowRideScreenProps) {
  const elapsedSeconds = useRideElapsed(startedAt, null)
  const { riders, notice, dismissNotice } = groupRide
  const { containerRef, hasLoadFailed, recenter, focusOn, indicators } = useFreeRideMap({
    accessToken: MAPBOX_ACCESS_TOKEN,
    rider,
    riders,
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
      <h1 className="visually-hidden">{title}</h1>
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
              aria-label={finishLabel}
              onClick={onFinish}
            >
              <span className="icon icon-flag-checkered" aria-hidden="true"></span>
            </button>
            <RidersControl riders={riders} onFocus={focusOn} />
            <ChangeRouteControl rider={rider} />
          </div>
        </div>
        <div className="map-controls map-control-bottom-center">
          <button
            className="icon-button"
            type="button"
            aria-label="Center on my location"
            onClick={recenter}
          >
            <span className="icon icon-locate" aria-hidden="true"></span>
          </button>
        </div>
      </div>
      <RideStatsPanel
        elapsedSeconds={elapsedSeconds}
        speed={location.speed}
        maxSpeed={maxSpeed}
        route={null}
        coveredKilometres={coveredKilometres}
        isTrack={isTrack}
        checkpoints={null}
      />
      {children}
    </main>
  )
}
