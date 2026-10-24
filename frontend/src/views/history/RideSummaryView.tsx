'use client'

import StateView from '@/components/feedback/StateView'
import CheckpointTimes from '@/components/route/CheckpointTimes'
import RoutePreview from '@/components/route/RoutePreview'
import { useRideSummaryDetail } from '@/hooks/useRideSummaryDetail'
import { useRouteLegs } from '@/hooks/useRouteLegs'
import { useRouteDetail } from '@/hooks/useRouteDetail'
import { formatRideDate } from '@/services/formatRoute'
import { RIDE_MODES } from '@/services/rideMode'
import { countCheckpoints } from '@/services/routeProgress'
import RideStatsGrid from '@/views/history/RideStatsGrid'
import type { RideSummaryDetail } from '@/types/rideSummary'
import type { Waypoint } from '@/types/route'

const NO_WAYPOINTS: readonly Waypoint[] = []

interface RideSummaryViewProps {
  summaryId: number
  /** Back to the history list. */
  onClose: () => void
}

function ParticipantList({ summary }: { summary: RideSummaryDetail }) {
  return (
    <section className="stack-sm" aria-label="Participants">
      <h2 className="text-subtitle">Participants</h2>
      <ul className="list">
        {summary.participants.map(({ id, username }) => (
          <li className="list-item" key={id}>
            <span className="avatar avatar-sm" aria-hidden="true">
              {username.charAt(0).toUpperCase()}
            </span>
            <span className="list-item-body">
              <span className="list-item-title">{username}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function RideSummaryContent({ summary }: { summary: RideSummaryDetail }) {
  const route = useRouteDetail(summary.route)
  const reachedAt = summary.reached_at.map((moment) => Date.parse(moment))
  const legKilometres = useRouteLegs(route.shownRoute)
  const waypoints = route.shownRoute?.waypoints ?? NO_WAYPOINTS
  const mode = RIDE_MODES[summary.route_type]

  return (
    <>
      <div className="stack-sm">
        <h2 className="text-subtitle">{summary.route_name}</h2>
        <p className="cluster text-small text-muted">
          {formatRideDate(summary.start_at)}
          <span className={`badge ${mode.badgeClass}`}>
            <span className={`icon icon-sm ${mode.iconClass}`} aria-hidden="true"></span>
            {mode.label}
          </span>
          {!summary.is_finished && <span className="badge badge-warning">Not finished</span>}
        </p>
      </div>
      {summary.route_type === 'ride' && (
        <RoutePreview size="compact" status={route.status} route={route.shownRoute} onRetry={route.retry} />
      )}
      <RideStatsGrid summary={summary} />
      {summary.route_type === 'ride' && (
        <CheckpointTimes
          startedAt={Date.parse(summary.start_at)}
          count={Math.max(countCheckpoints(waypoints), reachedAt.length - 1)}
          waypoints={waypoints}
          reachedAt={reachedAt}
          finishedAt={summary.is_finished ? Date.parse(summary.end_at) : null}
          legKilometres={legKilometres}
        />
      )}
      <ParticipantList summary={summary} />
    </>
  )
}

/** One ride of the history: its route and preview, who rode, the time it took, the speeds and when each checkpoint was reached. */
export default function RideSummaryView({ summaryId, onClose }: RideSummaryViewProps) {
  const detail = useRideSummaryDetail(summaryId)

  return (
    <main className="screen-body">
      <div className="screen-header">
        <h1 className="text-heading">Ride summary</h1>
        <button className="icon-button" type="button" aria-label="Close" onClick={onClose}>
          <span className="icon icon-x" aria-hidden="true"></span>
        </button>
      </div>
      {detail.summary && <RideSummaryContent summary={detail.summary} />}
      {detail.status === 'loading' && (
        <div className="stack-sm" aria-busy="true" aria-label="Loading ride">
          <span className="skeleton skeleton-title"></span>
          <span className="skeleton skeleton-line"></span>
          <span className="skeleton skeleton-line"></span>
        </div>
      )}
      {detail.status === 'failed' && (
        <StateView
          title="Could not load this ride"
          description="Check your connection and try again."
          action={
            <button className="button button-soft" type="button" onClick={detail.retry}>
              Try again
            </button>
          }
        >
          <span className="icon icon-lg icon-alert"></span>
        </StateView>
      )}
    </main>
  )
}
