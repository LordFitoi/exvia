import StateView from '@/components/feedback/StateView'
import { formatAverageSpeed, formatClock, formatRideDate } from '@/services/formatRoute'
import type { RideSummaryListItem } from '@/types/rideSummary'

const SKELETON_ROW_IDS = [1, 2, 3] as const

interface RideSummaryListProps {
  status: 'loading' | 'ready' | 'failed'
  summaries: readonly RideSummaryListItem[]
  onSelect: (id: number) => void
  onRetry: () => void
}

function RideSummarySkeleton() {
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

/** The rides, one row each: route name, then the day, the time it took and the average speed (a ride quit early has no average and is marked). */
export default function RideSummaryList({ status, summaries, onSelect, onRetry }: RideSummaryListProps) {
  if (status === 'loading') return <RideSummarySkeleton />

  if (status === 'failed') {
    return (
      <StateView
        title="Could not load your rides"
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

  if (summaries.length === 0) {
    return (
      <StateView
        title="No rides yet"
        description="Finish a ride from the Ride tab and it shows up here."
      >
        <span className="icon icon-lg icon-flag-checkered"></span>
      </StateView>
    )
  }

  return (
    <ul className="list">
      {summaries.map(({ id, route_name, start_at, duration, distance, is_finished }) => (
        <li key={id}>
          <button className="list-item" type="button" onClick={() => onSelect(id)}>
            <span className="list-item-icon" aria-hidden="true">
              <span className="icon icon-flag-checkered"></span>
            </span>
            <span className="list-item-body">
              <span className="list-item-title">{route_name}</span>
              <span className="list-item-meta">
                {formatRideDate(start_at)} · {formatClock(duration)}
                {is_finished && ` · ${formatAverageSpeed(distance, duration)} km/h`}
              </span>
            </span>
            {!is_finished && <span className="badge badge-warning">Not finished</span>}
            <span className="icon icon-chevron-right" aria-hidden="true"></span>
          </button>
        </li>
      ))}
    </ul>
  )
}
