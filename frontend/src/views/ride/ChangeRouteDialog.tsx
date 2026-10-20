'use client'

import { useGroupRouteChange } from '@/hooks/useGroupRouteChange'
import { useLiveGroup } from '@/hooks/useLiveGroup'
import { useMyRoutes } from '@/hooks/useMyRoutes'
import type { RideSelection } from '@/types/rideSelection'
import RouteChoiceDialog from '@/views/ride/RouteChoiceDialog'

interface ChangeRouteDialogProps {
  onClose: () => void
}

const FREE_SELECTION: RideSelection = { kind: 'free' }

/** The route picker for the ride under way. Saving changes the route of the whole group; it loads the routes when opened. */
export default function ChangeRouteDialog({ onClose }: ChangeRouteDialogProps) {
  const { group, replaceGroup } = useLiveGroup()
  const myRoutes = useMyRoutes()
  const currentRouteId = group.route?.id ?? null
  const current: RideSelection = currentRouteId ? { kind: 'route', id: currentRouteId } : FREE_SELECTION
  const routeChange = useGroupRouteChange(group.id, (changed) => {
    replaceGroup(changed)
    onClose()
  })

  const handleSave = (selection: RideSelection) => {
    const chosenRouteId = selection.kind === 'route' ? selection.id : null
    if (chosenRouteId === currentRouteId) onClose()
    else routeChange.change(selection)
  }

  return (
    <RouteChoiceDialog
      myRoutes={myRoutes}
      selection={current}
      isPending={routeChange.isPending}
      formError={routeChange.error}
      onSave={handleSave}
      onClose={onClose}
    />
  )
}
