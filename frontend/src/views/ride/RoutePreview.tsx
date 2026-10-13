'use client'

import 'mapbox-gl/dist/mapbox-gl.css'

import StateView from '@/components/feedback/StateView'
import { useRoutePreviewMap } from '@/hooks/useRoutePreviewMap'
import { MAPBOX_ACCESS_TOKEN } from '@/services/mapboxConfig'
import type { Coordinates } from '@/types/geolocation'
import type { RouteDetail } from '@/types/route'

interface RoutePreviewProps {
  status: 'idle' | 'loading' | 'ready' | 'failed'
  /** The last route that loaded; kept on the map while the next one loads. */
  route: RouteDetail | null
  onRetry: () => void
}

function PreviewMap({ path }: { path: readonly Coordinates[] }) {
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

export default function RoutePreview({ status, route, onRetry }: RoutePreviewProps) {
  return (
    <div className="route-preview route-preview-fill map-grayscale" aria-busy={status === 'loading'}>
      {status === 'failed' ? (
        <StateView
          title="Could not load this route"
          description="Check your connection and try again."
          action={
            <button className="button button-soft" type="button" onClick={onRetry}>
              Try again
            </button>
          }
        >
          <span className="icon icon-lg icon-alert"></span>
        </StateView>
      ) : route ? (
        <PreviewMap path={route.points} />
      ) : (
        <StateView
          title={status === 'loading' ? 'Loading route' : 'Select a route'}
          description="Pick one of your routes below to preview it on the map."
        >
          <span className="icon icon-lg icon-route"></span>
        </StateView>
      )}
    </div>
  )
}
