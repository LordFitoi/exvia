import { formatDistance, formatDuration, formatShortDate } from '@/services/formatRoute'
import type { SharedRoute } from '@/types/sharedRoute'

interface RouteSharePanelProps {
  route: SharedRoute
}

interface RouteFactProps {
  value: string
  label: string
}

function RouteFact({ value, label }: RouteFactProps) {
  return (
    <div className="route-stat">
      <span className="route-stat-value data">{value}</span>
      <span className="text-caption">{label}</span>
    </div>
  )
}

/** The panel under the map of a shared route: its name, who drew it, and its numbers. */
export default function RouteSharePanel({ route }: RouteSharePanelProps) {
  const { name, description, author, distance, estimated_time, created_at } = route

  return (
    <section className="map-panel" aria-labelledby="shared-route-title">
      <div className="map-panel-header">
        <h1 className="text-subtitle" id="shared-route-title">
          {name}
        </h1>
        <span className="badge badge-primary">Shared route</span>
      </div>
      <p className="cluster text-small text-muted">
        <span className="avatar avatar-sm" aria-hidden="true">
          {author.charAt(0).toUpperCase()}
        </span>
        Drawn by {author}
      </p>
      {description && <p className="text-small">{description}</p>}
      <div className="route-stats">
        <RouteFact value={formatDistance(distance)} label="Distance" />
        <RouteFact value={formatDuration(estimated_time)} label="Est. time" />
        <RouteFact value={formatShortDate(created_at)} label="Created" />
      </div>
    </section>
  )
}
