'use client'

import 'mapbox-gl/dist/mapbox-gl.css'

import StateView from '@/components/feedback/StateView'
import { useRoutePreviewMap } from '@/hooks/useRoutePreviewMap'
import { MAPBOX_ACCESS_TOKEN } from '@/services/mapboxConfig'
import type { Coordinates } from '@/types/geolocation'

interface PreviewMapProps {
  path: readonly Coordinates[]
}

/** A map filling its container with the whole route in view, or a message when the map cannot load. */
export default function PreviewMap({ path }: PreviewMapProps) {
  const { containerRef, hasLoadFailed } = useRoutePreviewMap({
    accessToken: MAPBOX_ACCESS_TOKEN,
    path,
  })

  if (hasLoadFailed) {
    return (
      <StateView
        title="Map unavailable"
        description="The map could not be loaded. Check your connection and try again later."
      >
        <span className="icon icon-lg icon-alert"></span>
      </StateView>
    )
  }
  return <div ref={containerRef} className="map-canvas"></div>
}
