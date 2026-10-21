'use client'

import 'mapbox-gl/dist/mapbox-gl.css'

import { useState } from 'react'

import FormAlert from '@/components/form/FormAlert'
import { useHideTabBar } from '@/hooks/useHideTabBar'
import { useRouteDraft } from '@/hooks/useRouteDraft'
import { useRouteMap } from '@/hooks/useRouteMap'
import { MAPBOX_ACCESS_TOKEN } from '@/services/mapboxConfig'
import { flattenRoutePath } from '@/services/routePath'
import MapStatusView from '@/views/map/MapStatusView'
import PlaceSearch from '@/views/routes/PlaceSearch'
import RoutePointList from '@/views/routes/RoutePointList'
import RouteSheet from '@/views/routes/RouteSheet'
import SaveRouteDialog from '@/views/routes/SaveRouteDialog'
import type { Coordinates } from '@/types/geolocation'
import type { Place } from '@/types/place'
import type { DraftPoint, NewRoute, SavedRoute } from '@/types/route'

const MIN_ROUTE_POINTS = 2

const COPY = {
  create: {
    title: 'New route',
    cancelLabel: 'Cancel new route',
    recenterLabel: 'Center on my location',
  },
  edit: {
    title: 'Edit route',
    cancelLabel: 'Cancel editing',
    recenterLabel: 'Center on the route',
  },
} as const

interface RouteEditorProps {
  mode: 'create' | 'edit'
  /** Where the camera starts. */
  center: Coordinates
  /** The rider's position for the "You" marker, or null for none. */
  userPosition: Coordinates | null
  /** The points the draft starts with; empty to draw a route from scratch. */
  initialPoints: readonly DraftPoint[]
  /** The name and description of the route being edited. */
  initialValues?: { name: string; description: string }
  saveRoute: (route: NewRoute) => Promise<SavedRoute>
  onClose: () => void
  onSaved: (route: SavedRoute) => void
}

const describePointCount = (count: number): string => `${count} ${count === 1 ? 'point' : 'points'}`

/** The map and sheet where a route is drawn: tap to add street points, then save. */
export default function RouteEditor({
  mode,
  center,
  userPosition,
  initialPoints,
  initialValues,
  saveRoute,
  onClose,
  onSaved,
}: RouteEditorProps) {
  const [isSaveOpen, setIsSaveOpen] = useState(false)
  const draft = useRouteDraft({ accessToken: MAPBOX_ACCESS_TOKEN, initialPoints })
  const { containerRef, hasLoadFailed, recenter, focusOn } = useRouteMap({
    accessToken: MAPBOX_ACCESS_TOKEN,
    center,
    userPosition,
    fitPath: initialPoints.length > 0 ? flattenRoutePath(initialPoints) : null,
    points: draft.points,
    onMapClick: draft.addPoint,
    onPointRemove: draft.removePoint,
  })
  const { title, cancelLabel, recenterLabel } = COPY[mode]

  const handlePlaceSelect = ({ coordinates, name }: Place) => {
    focusOn(coordinates)
    draft.addPoint(coordinates, name)
  }

  // The load-failure screen has no way out of its own, so it keeps the tab bar.
  useHideTabBar(!hasLoadFailed)

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
    <main className="map">
      <h1 className="visually-hidden">{title}</h1>
      <div ref={containerRef} className="map-canvas"></div>
      <div className="map-overlay">
        <PlaceSearch proximity={userPosition ?? center} onSelect={handlePlaceSelect} />
        <div className="map-controls">
          <button className="icon-button" type="button" aria-label={cancelLabel} onClick={onClose}>
            <span className="icon icon-x" aria-hidden="true"></span>
          </button>
          <button className="icon-button" type="button" aria-label={recenterLabel} onClick={recenter}>
            <span className="icon icon-locate" aria-hidden="true"></span>
          </button>
        </div>
      </div>
      <RouteSheet title={title} statusLabel={statusLabel} notice={<FormAlert message={draft.error} />}>
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
          {mode === 'edit' ? 'Save changes' : 'Save route'}
        </button>
      </RouteSheet>
      <SaveRouteDialog
        isOpen={isSaveOpen}
        mode={mode}
        geometry={{
          points: flattenRoutePath(draft.points),
          waypoints: draft.points.map(({ coordinates }) => coordinates),
        }}
        initialValues={initialValues}
        saveRoute={saveRoute}
        onClose={() => setIsSaveOpen(false)}
        onSaved={onSaved}
      />
    </main>
  )
}
