import LoadFailedState from '@/components/feedback/LoadFailedState'
import FreeModeItemBody from '@/components/route/FreeModeItemBody'
import RouteItemBody from '@/components/route/RouteItemBody'
import type { RideSelection } from '@/types/rideSelection'
import type { RouteSummary } from '@/types/route'

interface RideChoiceListProps {
  selection: RideSelection | null
  status: 'loading' | 'ready' | 'failed'
  routes: readonly RouteSummary[]
  onSelect: (selection: RideSelection) => void
  onRetry: () => void
}

const CHECK = <span className="icon icon-check" aria-hidden="true"></span>

/** Free mode first, then the rider's routes, as rows of one list where exactly one is chosen. */
export default function RideChoiceList({ selection, status, routes, onSelect, onRetry }: RideChoiceListProps) {
  const isFreeSelected = selection?.kind === 'free'
  const selectedRouteId = selection?.kind === 'route' ? selection.id : null

  return (
    <>
      <div className="route-choice-list">
        <ul className="list">
          <li>
            <button
              className="list-item"
              type="button"
              aria-pressed={isFreeSelected}
              onClick={() => onSelect({ kind: 'free' })}
            >
              <FreeModeItemBody />
              {isFreeSelected && CHECK}
            </button>
          </li>
          {routes.map((route) => (
            <li key={route.id}>
              <button
                className="list-item"
                type="button"
                aria-pressed={route.id === selectedRouteId}
                onClick={() => onSelect({ kind: 'route', id: route.id })}
              >
                <RouteItemBody route={route} />
                {route.id === selectedRouteId && CHECK}
              </button>
            </li>
          ))}
        </ul>
      </div>
      {status === 'loading' && (
        <p className="text-small text-muted" role="status">
          Loading your routes…
        </p>
      )}
      {status === 'failed' && <LoadFailedState title="Could not load your routes" onRetry={onRetry} />}
      {status === 'ready' && routes.length === 0 && (
        <p className="text-small text-muted">No routes yet. Draw one with the route button on the map.</p>
      )}
    </>
  )
}
