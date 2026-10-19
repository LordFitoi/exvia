import FreeModeItemBody from '@/components/route/FreeModeItemBody'
import RouteItemBody from '@/components/route/RouteItemBody'
import type { useMyRoutes } from '@/hooks/useMyRoutes'
import type { RideSelection } from '@/types/rideSelection'

interface RideRouteSectionProps {
  myRoutes: ReturnType<typeof useMyRoutes>
  /** What is selected, or null while the routes load. */
  selection: RideSelection | null
  /** Opens the dialog to choose another route. */
  onChange: () => void
}

/** The route (or free mode) the ride will use, with a way to change it. */
export default function RideRouteSection({ myRoutes, selection, onChange }: RideRouteSectionProps) {
  const route =
    selection?.kind === 'route' ? myRoutes.routes.find(({ id }) => id === selection.id) : undefined

  const renderItem = () => {
    if (selection?.kind === 'free') return <FreeModeItemBody />
    if (route) return <RouteItemBody route={route} />
    if (myRoutes.status === 'failed') return <span className="text-small text-muted">Could not load your routes.</span>
    return (
      <>
        <span className="skeleton skeleton-avatar"></span>
        <span className="list-item-body stack-sm" aria-busy="true">
          <span className="skeleton skeleton-title"></span>
          <span className="skeleton skeleton-line"></span>
        </span>
      </>
    )
  }

  return (
    <section aria-labelledby="ride-route-title">
      <div className="section-heading">
        <h2 id="ride-route-title">Route</h2>
        <button className="link-action" type="button" onClick={onChange}>
          Change
        </button>
      </div>
      <ul className="list">
        <li className="list-item">{renderItem()}</li>
      </ul>
    </section>
  )
}
