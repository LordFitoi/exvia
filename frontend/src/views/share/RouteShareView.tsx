import PreviewMap from '@/components/route/PreviewMap'
import RouteSharePanel from '@/views/share/RouteSharePanel'
import type { SharedRoute } from '@/types/sharedRoute'

interface RouteShareViewProps {
  route: SharedRoute
}

/** The public page of a route: its map on top and a panel with its details below. */
export default function RouteShareView({ route }: RouteShareViewProps) {
  return (
    <div className="app-shell">
      <main className="ride-screen">
        <div className="map">
          <PreviewMap path={route.points} />
        </div>
        <RouteSharePanel route={route} />
      </main>
    </div>
  )
}
