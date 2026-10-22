'use client'

import 'mapbox-gl/dist/mapbox-gl.css'

import { useState } from 'react'

import { useDestinationArrival } from '@/hooks/useDestinationArrival'
import { useDestinationMap } from '@/hooks/useDestinationMap'
import { useHideTabBar } from '@/hooks/useHideTabBar'
import { useRideDistance } from '@/hooks/useRideDistance'
import { useRideElapsed } from '@/hooks/useRideElapsed'
import { useRideMaxSpeed } from '@/hooks/useRideMaxSpeed'
import { useStreetRoute } from '@/hooks/useStreetRoute'
import { useWakeLock } from '@/hooks/useWakeLock'
import { MAPBOX_ACCESS_TOKEN } from '@/services/mapboxConfig'
import type { Coordinates, GeolocationState } from '@/types/geolocation'
import type { Place } from '@/types/place'
import EdgeIndicators from '@/views/ride/EdgeIndicators'
import RideStatsPanel from '@/views/ride/RideStatsPanel'
import DestinationSummarySheet from '@/views/map/DestinationSummarySheet'
import MapStatusView from '@/views/map/MapStatusView'

const METERS_PER_KILOMETER = 1000

interface DestinationRideViewProps {
  destination: Place
  /** The latest GPS reading, whose speed and fix time make up the ride's stats. */
  location: GeolocationState
  /** Where to show the rider: the street position when there is one, else the raw fix. */
  rider: Coordinates
  /** Leaves the ride, back to the map. */
  onQuit: () => void
}

/**
 * Ride mode towards a searched place. There is no saved route: the path is the street way from where
 * the rider is now, asked again as they move, so it follows them wherever they turn. Nothing is recorded.
 */
export default function DestinationRideView({ destination, location, rider, onQuit }: DestinationRideViewProps) {
  const { path, distance, duration } = useStreetRoute({
    accessToken: MAPBOX_ACCESS_TOKEN,
    from: rider,
    to: destination.coordinates,
  })
  // The ride ends on arrival or when the rider quits; both stop the clock and the stats.
  const [quitAt, setQuitAt] = useState<number | null>(null)
  // A rider who quit has left the ride, so riding up to the place afterwards is not an arrival.
  const arrivedAt = useDestinationArrival({
    rider,
    destination: path[path.length - 1] ?? destination.coordinates,
    fixTime: quitAt === null ? location.timestamp : null,
  })
  const [startedAt] = useState(() => Date.now())
  // The route is asked again every 50 m, so what is left is exact to that; at the place it is nothing.
  const toGo = {
    distance: arrivedAt === null ? distance / METERS_PER_KILOMETER : 0,
    estimated_time: arrivedAt === null ? duration : 0,
  }
  const endedAt = arrivedAt ?? quitAt
  const coveredKilometres = useRideDistance(rider, endedAt === null)
  const elapsedSeconds = useRideElapsed(startedAt, endedAt)
  const maxSpeed = useRideMaxSpeed({
    speed: location.speed,
    fixTime: location.timestamp,
    isRiding: endedAt === null,
  })
  const { containerRef, hasLoadFailed, recenter, indicators } = useDestinationMap({
    accessToken: MAPBOX_ACCESS_TOKEN,
    rider,
    destination: destination.coordinates,
    path,
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
      <h1 className="visually-hidden">Riding to {destination.name}</h1>
      <div className="map">
        <div ref={containerRef} className="map-canvas"></div>
        <EdgeIndicators indicators={indicators} />
        <div className="map-overlay">
          <div className="map-controls">
            <button className="icon-button" type="button" aria-label="Quit ride" onClick={() => setQuitAt(Date.now())}>
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
      <RideStatsPanel
        elapsedSeconds={elapsedSeconds}
        speed={location.speed}
        maxSpeed={maxSpeed}
        route={toGo}
        isToGo
        coveredKilometres={coveredKilometres}
        checkpoints={null}
      />
      {endedAt !== null && (
        <DestinationSummarySheet
          placeName={destination.name}
          isFinished={arrivedAt !== null}
          rideSeconds={elapsedSeconds}
          kilometres={coveredKilometres}
          maxSpeed={maxSpeed}
          onClose={onQuit}
        />
      )}
    </main>
  )
}
