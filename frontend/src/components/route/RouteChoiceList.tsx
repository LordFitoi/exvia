import type { ReactNode } from 'react'

import StateView from '@/components/feedback/StateView'
import RouteItemBody from '@/components/route/RouteItemBody'
import type { RouteSummary } from '@/types/route'

const SKELETON_ROW_IDS = [1, 2, 3] as const

interface RouteChoiceListProps {
  /** `rows` shows four routes and scrolls; `fill` takes the free height of its column. */
  size: 'rows' | 'fill'
  status: 'loading' | 'ready' | 'failed'
  routes: readonly RouteSummary[]
  selectedId: string | null
  onSelect: (id: string) => void
  onRetry: () => void
  /** What the empty state offers, such as a link to draw the first route. */
  emptyAction: ReactNode
  /** The more-options menu of the selected route. With it, the row has that menu instead of the check. */
  renderMenu?: (route: RouteSummary) => ReactNode
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
  renderMenu,
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
        {routes.map((route) => {
          const isSelected = route.id === selectedId
          if (renderMenu) {
            return (
              <li className="list-item list-item-split" key={route.id}>
                <button
                  className="list-item-main"
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onSelect(route.id)}
                >
                  <RouteItemBody route={route} />
                </button>
                {isSelected && renderMenu(route)}
              </li>
            )
          }
          return (
            <li key={route.id}>
              <button
                className="list-item"
                type="button"
                aria-pressed={isSelected}
                onClick={() => onSelect(route.id)}
              >
                <RouteItemBody route={route} />
                {isSelected && <span className="icon icon-check" aria-hidden="true"></span>}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
