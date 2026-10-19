import { formatDistance, formatDuration } from '@/services/formatRoute'
import type { SavedRoute } from '@/types/route'

interface RouteItemBodyProps {
  route: Pick<SavedRoute, 'name' | 'distance' | 'estimated_time'>
}

/** The inside of a route row: the route icon, its name, and its distance and time. */
export default function RouteItemBody({ route }: RouteItemBodyProps) {
  return (
    <>
      <span className="list-item-icon" aria-hidden="true">
        <span className="icon icon-route"></span>
      </span>
      <span className="list-item-body">
        <span className="list-item-title">{route.name}</span>
        <span className="list-item-meta">
          {formatDistance(route.distance)} · {formatDuration(route.estimated_time)}
        </span>
      </span>
    </>
  )
}
