'use client'

import { useId, useState } from 'react'

import { formatDistance, formatDuration, formatShortDate } from '@/services/formatRoute'
import type { SharedRoute } from '@/types/sharedRoute'
import RouteCheckpointList from '@/views/share/RouteCheckpointList'
import RouteShareActions from '@/views/share/RouteShareActions'

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

/**
 * The panel under the map of a shared route: its name, who drew it, and its numbers. The chevron in its
 * header unfolds the list of checkpoints; a route with none stored has no chevron.
 */
export default function RouteSharePanel({ route }: RouteSharePanelProps) {
  const { name, description, author, distance, estimated_time, created_at } = route
  const [isExpanded, setIsExpanded] = useState(false)
  const checkpointsId = useId()
  const hasCheckpoints = route.waypoints.length > 0

  return (
    <section className="map-panel" aria-labelledby="shared-route-title">
      <div className="map-panel-header">
        <h1 className="text-subtitle" id="shared-route-title">
          {name}
        </h1>
        {hasCheckpoints && (
          <button
            className="icon-button map-panel-toggle"
            type="button"
            aria-label={isExpanded ? 'Hide checkpoints' : 'Show checkpoints'}
            aria-expanded={isExpanded}
            aria-controls={checkpointsId}
            onClick={() => setIsExpanded((previous) => !previous)}
          >
            <span className="icon icon-chevron-down" aria-hidden="true"></span>
          </button>
        )}
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
      {hasCheckpoints && <RouteCheckpointList id={checkpointsId} route={route} isExpanded={isExpanded} />}
      <RouteShareActions path={route.points} />
    </section>
  )
}
