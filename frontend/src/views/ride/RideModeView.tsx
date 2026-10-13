'use client'

import 'mapbox-gl/dist/mapbox-gl.css'

import { useGeolocation } from '@/hooks/useGeolocation'
import { useHideTabBar } from '@/hooks/useHideTabBar'
import { useRideLines } from '@/hooks/useRideLines'
import { useRideMap } from '@/hooks/useRideMap'
import { useStreetPosition } from '@/hooks/useStreetPosition'
import { useWakeLock } from '@/hooks/useWakeLock'
import { MAPBOX_ACCESS_TOKEN } from '@/services/mapboxConfig'
import MapStatusView from '@/views/map/MapStatusView'
import type { RouteDetail } from '@/types/route'

interface RideModeViewProps {
  route: RouteDetail
  onQuit: () => void
}

export default function RideModeView({ route, onQuit }: RideModeViewProps) {
  const location = useGeolocation()
  const street = useStreetPosition({
    accessToken: MAPBOX_ACCESS_TOKEN,
    coordinates: location.coordinates,
  })
  // A fix that cannot be snapped to a street (or not yet) still shows where the rider is.
  const rider = street.coordinates ?? location.coordinates
  const lines = useRideLines({
    accessToken: MAPBOX_ACCESS_TOKEN,
    path: route.points,
    waypoints: route.waypoints,
    rider,
  })
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
    <main className="map map-grayscale">
      <h1 className="visually-hidden">Riding {route.name}</h1>
      <div ref={containerRef} className="map-canvas"></div>
      <div className="map-overlay">
        <div className="map-controls">
          <button className="icon-button" type="button" aria-label="Quit ride" onClick={onQuit}>
            <span className="icon icon-x" aria-hidden="true"></span>
          </button>
          <button className="icon-button" type="button" aria-label="Center on my location" onClick={recenter}>
            <span className="icon icon-locate" aria-hidden="true"></span>
          </button>
        </div>
      </div>
    </main>
  )
}
