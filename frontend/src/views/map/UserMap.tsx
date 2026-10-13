'use client'

import 'mapbox-gl/dist/mapbox-gl.css'

import MapStatusView from '@/views/map/MapStatusView'
import { useUserMap } from '@/hooks/useUserMap'
import { MAPBOX_ACCESS_TOKEN } from '@/services/mapboxConfig'
import type { Coordinates } from '@/types/geolocation'

interface UserMapProps {
  coordinates: Coordinates
}

export default function UserMap({ coordinates }: UserMapProps) {
  const { containerRef, hasLoadFailed, recenter } = useUserMap({
    accessToken: MAPBOX_ACCESS_TOKEN,
    coordinates,
  })

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
      <h1 className="visually-hidden">Map</h1>
      <div ref={containerRef} className="map-canvas"></div>
      <div className="map-overlay">
        <div className="map-controls">
          <button className="icon-button" type="button" aria-label="Center on my location" onClick={recenter}>
            <span className="icon icon-locate" aria-hidden="true"></span>
          </button>
        </div>
      </div>
    </main>
  )
}
