import type { ReactNode } from 'react'

import StateView from '@/components/feedback/StateView'
import { formatDistance, formatDuration } from '@/services/formatRoute'
import type { RouteSummary } from '@/types/route'

const SKELETON_ROW_IDS = [1, 2, 3] as const

interface RouteChoiceListProps {
  /** `rows` shows four routes and scrolls; `fill` takes the free height of its column. */
  size: 'rows' | 'fill'
  status: 'loading' | 'ready' | 'failed'
  routes: readonly RouteSummary[]
  selectedId: number | null
  onSelect: (id: number) => void
  onRetry: () => void
  /** What the empty state offers, such as a link to draw the first route. */
  emptyAction: ReactNode
}

function RouteChoiceSkeleton() {
  return (
    <ul className="list" aria-busy="true">
      {SKELETON_ROW_IDS.map((id) => (
        <li className="list-item" key={id}>
          <span className="skeleton skeleton-avatar"></span>
          <span className="list-item-body stack-sm">
            <span className="skeleton skeleton-title"></span>
            <span className="skeleton skeleton-line"></span>
          </span>
        </li>
      ))}
    </ul>
  )
}

export default function RouteChoiceList({
  size,
  status,
  routes,
  selectedId,
  onSelect,
  onRetry,
  emptyAction,
}: RouteChoiceListProps) {
  if (status === 'loading') return <RouteChoiceSkeleton />

  if (status === 'failed') {
    return (
      <StateView
        title="Could not load your routes"
        description="Check your connection and try again."
        action={
          <button className="button button-soft" type="button" onClick={onRetry}>
            Try again
          </button>
        }
      >
        <span className="icon icon-lg icon-alert"></span>
      </StateView>
    )
  }

  if (routes.length === 0) {
    return (
      <StateView
        title="No routes yet"
        description="Draw your first route with the route button on the map."
        action={emptyAction}
      >
        <span className="icon icon-lg icon-route"></span>
      </StateView>
    )
  }

  return (
    <div className={size === 'fill' ? 'route-choice-list route-choice-list-fill' : 'route-choice-list'}>
      <ul className="list">
        {routes.map(({ id, name, distance, estimated_time }) => (
          <li key={id}>
            <button
              className="list-item"
              type="button"
              aria-pressed={id === selectedId}
              onClick={() => onSelect(id)}
            >
              <span className="list-item-icon" aria-hidden="true">
                <span className="icon icon-route"></span>
              </span>
              <span className="list-item-body">
                <span className="list-item-title">{name}</span>
                <span className="list-item-meta">
                  {formatDistance(distance)} · {formatDuration(estimated_time)}
                </span>
              </span>
              {id === selectedId && <span className="icon icon-check" aria-hidden="true"></span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
