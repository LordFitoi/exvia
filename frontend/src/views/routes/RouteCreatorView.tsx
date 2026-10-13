'use client'

import 'mapbox-gl/dist/mapbox-gl.css'

import { useState } from 'react'

import FormAlert from '@/components/form/FormAlert'
import { useRouteDraft } from '@/hooks/useRouteDraft'
import { useRouteMap } from '@/hooks/useRouteMap'
import { MAPBOX_ACCESS_TOKEN } from '@/services/mapboxConfig'
import { flattenRoutePath } from '@/services/routePath'
import MapStatusView from '@/views/map/MapStatusView'
import RoutePointList from '@/views/routes/RoutePointList'
import SaveRouteDialog from '@/views/routes/SaveRouteDialog'
import type { Coordinates } from '@/types/geolocation'
import type { SavedRoute } from '@/types/route'

const MIN_ROUTE_POINTS = 2

interface RouteCreatorViewProps {
  coordinates: Coordinates
  onClose: () => void
  onSaved: (route: SavedRoute) => void
}

const describePointCount = (count: number): string => `${count} ${count === 1 ? 'point' : 'points'}`

export default function RouteCreatorView({ coordinates, onClose, onSaved }: RouteCreatorViewProps) {
  const [isSaveOpen, setIsSaveOpen] = useState(false)
  const draft = useRouteDraft({ accessToken: MAPBOX_ACCESS_TOKEN })
  const { containerRef, hasLoadFailed, recenter } = useRouteMap({
    accessToken: MAPBOX_ACCESS_TOKEN,
    center: coordinates,
    points: draft.points,
    onMapClick: draft.addPoint,
    onPointRemove: draft.removePoint,
  })

  if (hasLoadFailed) {
    return (
      <MapStatusView
        title="Map unavailable"
        description="The map could not be loaded. Check your connection and try again later."
      />
    )
  }

  const statusLabel = draft.isBusy ? 'Routing…' : describePointCount(draft.points.length)
  const canSave = draft.points.length >= MIN_ROUTE_POINTS && !draft.isBusy

  return (
    <main className="map map-grayscale">
      <h1 className="visually-hidden">New route</h1>
      <div ref={containerRef} className="map-canvas"></div>
      <div className="map-overlay">
        <div className="map-controls">
          <button className="icon-button" type="button" aria-label="Cancel new route" onClick={onClose}>
            <span className="icon icon-x" aria-hidden="true"></span>
          </button>
          <button className="icon-button" type="button" aria-label="Center on my location" onClick={recenter}>
            <span className="icon icon-locate" aria-hidden="true"></span>
          </button>
        </div>
      </div>
      <div className="sheet map-sheet" role="region" aria-label="Route points">
        <span className="sheet-handle"></span>
        <div className="sheet-header">
          <h2 className="text-subtitle">New route</h2>
          <span className="badge badge-primary" aria-live="polite">
            {statusLabel}
          </span>
        </div>
        <FormAlert message={draft.error} />
        <RoutePointList
          points={draft.points}
          onRemove={draft.removePoint}
          onMove={draft.movePoint}
        />
        <button
          className="button button-primary button-lg button-block"
          type="button"
          disabled={!canSave}
          onClick={() => setIsSaveOpen(true)}
        >
          Save route
        </button>
      </div>
      <SaveRouteDialog
        isOpen={isSaveOpen}
        path={flattenRoutePath(draft.points)}
        onClose={() => setIsSaveOpen(false)}
        onSaved={onSaved}
      />
    </main>
  )
}
