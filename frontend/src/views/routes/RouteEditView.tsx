'use client'

import { useMemo } from 'react'

import StateView from '@/components/feedback/StateView'
import { useHideTabBar } from '@/hooks/useHideTabBar'
import { useInitialDraftPoints } from '@/hooks/useInitialDraftPoints'
import { MAPBOX_ACCESS_TOKEN } from '@/services/mapboxConfig'
import { updateRoute } from '@/services/routesApi'
import RouteEditor from '@/views/routes/RouteEditor'
import type { Coordinates } from '@/types/geolocation'
import type { NewRoute, RouteDetail, SavedRoute } from '@/types/route'

interface RouteEditViewProps {
  route: RouteDetail
  onClose: () => void
  onSaved: (route: SavedRoute) => void
}

// Routes saved before waypoints were stored only have their street path, so they open with
// their start and finish and the rider adds the points in between again.
const getEditableWaypoints = ({ waypoints, points }: RouteDetail): readonly Coordinates[] =>
  waypoints.length > 0 ? waypoints : [points[0], points[points.length - 1]]

/** Edits an existing route: the creator, started from the route's own points. */
export default function RouteEditView({ route, onClose, onSaved }: RouteEditViewProps) {
  const waypoints = useMemo(() => getEditableWaypoints(route), [route])
  const initial = useInitialDraftPoints(MAPBOX_ACCESS_TOKEN, waypoints)
  // The route is rebuilt before the editor opens; the tab bar stays away meanwhile. Once the
  // editor is showing, it decides that itself.
  useHideTabBar(initial.status !== 'ready')

  if (initial.status !== 'ready') {
    const hasFailed = initial.status === 'failed'
    return (
      <main className="screen-body">
        <div className="screen-header">
          <h1 className="text-heading">Edit route</h1>
          <button className="icon-button" type="button" aria-label="Cancel editing" onClick={onClose}>
            <span className="icon icon-x" aria-hidden="true"></span>
          </button>
        </div>
        <StateView
          title={hasFailed ? 'Could not open this route' : 'Opening route'}
          description={
            hasFailed
              ? 'The streets between its points could not be loaded. Check your connection and try again.'
              : 'Following the streets between its points.'
          }
          action={
            hasFailed && (
              <button className="button button-soft" type="button" onClick={initial.retry}>
                Try again
              </button>
            )
          }
        >
          <span className={`icon icon-lg ${hasFailed ? 'icon-alert' : 'icon-route'}`}></span>
        </StateView>
      </main>
    )
  }

  const saveChanges = (changes: NewRoute) => updateRoute(route.id, changes)
  return (
    <RouteEditor
      mode="edit"
      center={waypoints[0]}
      userPosition={null}
      initialPoints={initial.points}
      initialValues={{ name: route.name, description: route.description }}
      saveRoute={saveChanges}
      onClose={onClose}
      onSaved={onSaved}
    />
  )
}
