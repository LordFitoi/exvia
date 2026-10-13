'use client'

import { createRoute } from '@/services/routesApi'
import RouteEditor from '@/views/routes/RouteEditor'
import type { Coordinates } from '@/types/geolocation'
import type { SavedRoute } from '@/types/route'

interface RouteCreatorViewProps {
  coordinates: Coordinates
  onClose: () => void
  onSaved: (route: SavedRoute) => void
}

export default function RouteCreatorView({ coordinates, onClose, onSaved }: RouteCreatorViewProps) {
  return (
    <RouteEditor
      mode="create"
      center={coordinates}
      userPosition={coordinates}
      initialPoints={[]}
      saveRoute={createRoute}
      onClose={onClose}
      onSaved={onSaved}
    />
  )
}
