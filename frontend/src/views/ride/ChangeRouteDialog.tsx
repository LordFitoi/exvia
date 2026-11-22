'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'

import { useGroupRouteChange } from '@/hooks/useGroupRouteChange'
import { useLiveGroup } from '@/hooks/useLiveGroup'
import { useMyRoutes } from '@/hooks/useMyRoutes'
import type { Coordinates } from '@/types/geolocation'
import { getGroupSelection, isSameSelection } from '@/services/rideSelection'
import type { SavedRoute } from '@/types/route'
import type { RideSelection } from '@/types/rideSelection'
import RouteChoiceDialog from '@/views/ride/RouteChoiceDialog'
import RouteCreatorView from '@/views/routes/RouteCreatorView'

interface ChangeRouteDialogProps {
  /** Where the leader is, to start drawing a route there; null while there is no position yet. */
  rider: Coordinates | null
  onClose: () => void
}

/**
 * The route picker for the ride under way. Saving changes the route of the whole group; it loads the routes
 * when opened. The leader can also draw a new route without leaving the ride: the creator opens over it in
 * place of the picker, and the picker comes back with the new route chosen (it is applied on Save).
 */
export default function ChangeRouteDialog({ rider, onClose }: ChangeRouteDialogProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [createdRouteId, setCreatedRouteId] = useState<string | null>(null)
  const { group, replaceGroup } = useLiveGroup()
  const myRoutes = useMyRoutes()
  const current = getGroupSelection(group)
  const shown: RideSelection = createdRouteId ? { kind: 'route', id: createdRouteId } : current
  const routeChange = useGroupRouteChange(group.id, (changed) => {
    replaceGroup(changed)
    onClose()
  })

  const handleSave = (selection: RideSelection) => {
    if (isSameSelection(selection, current)) onClose()
    else routeChange.change(selection)
  }

  const handleCreated = (route: SavedRoute) => {
    setCreatedRouteId(route.id)
    myRoutes.reload()
    setIsCreating(false)
  }

  if (isCreating && rider) {
    return createPortal(
      <div className="screen-overlay">
        <RouteCreatorView coordinates={rider} onClose={() => setIsCreating(false)} onSaved={handleCreated} />
      </div>,
      document.body,
    )
  }

  return (
    <RouteChoiceDialog
      myRoutes={myRoutes}
      selection={shown}
      isPending={routeChange.isPending}
      formError={routeChange.error}
      onSave={handleSave}
      onCreateRoute={rider ? () => setIsCreating(true) : undefined}
      onClose={onClose}
    />
  )
}
