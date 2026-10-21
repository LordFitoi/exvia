'use client'

import ConfirmDialog from '@/components/feedback/ConfirmDialog'
import StateView from '@/components/feedback/StateView'
import CheckpointTimes from '@/components/route/CheckpointTimes'
import RoutePreview from '@/components/route/RoutePreview'
import { useAuth } from '@/hooks/useAuth'
import { useRideSummaryDeletion } from '@/hooks/useRideSummaryDeletion'
import { useRideSummaryDetail } from '@/hooks/useRideSummaryDetail'
import { useRouteLegs } from '@/hooks/useRouteLegs'
import { useRouteDetail } from '@/hooks/useRouteDetail'
import { formatRideDate } from '@/services/formatRoute'
import { countCheckpoints } from '@/services/routeProgress'
import RideStatsGrid from '@/views/history/RideStatsGrid'
import type { RideSummaryDetail } from '@/types/rideSummary'

interface RideSummaryViewProps {
  summaryId: number
  /** Back to the history list. */
  onClose: () => void
  /** The ride was deleted; the list should reload and show without it. */
  onDeleted: () => void
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

  return (
    <>
      <div className="stack-sm">
        <h2 className="text-subtitle">{summary.route_name}</h2>
        <p className="cluster text-small text-muted">
          {formatRideDate(summary.start_at)}
          {!summary.is_finished && <span className="badge badge-warning">Not finished</span>}
        </p>
      </div>
      <RoutePreview size="compact" status={route.status} route={route.shownRoute} onRetry={route.retry} />
      <RideStatsGrid summary={summary} />
      <CheckpointTimes
        startedAt={Date.parse(summary.start_at)}
        count={Math.max(countCheckpoints(route.shownRoute?.waypoints ?? []), reachedAt.length - 1)}
        reachedAt={reachedAt}
        finishedAt={summary.is_finished ? Date.parse(summary.end_at) : null}
        legKilometres={legKilometres}
      />
      <ParticipantList summary={summary} />
    </>
  )
}

/** One ride of the history: its route and preview, who rode, the time it took, the speeds and when each checkpoint was reached. */
export default function RideSummaryView({ summaryId, onClose, onDeleted }: RideSummaryViewProps) {
  const { user } = useAuth()
  const detail = useRideSummaryDetail(summaryId)
  const deletion = useRideSummaryDeletion({ summaryId, onDeleted })

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
      {detail.summary && detail.summary.author === user?.id && (
        <button
          className="button button-soft button-error button-lg button-block"
          type="button"
          onClick={deletion.requestDeletion}
        >
          <span className="icon icon-trash" aria-hidden="true"></span>
          Delete ride
        </button>
      )}
      <ConfirmDialog
        isOpen={deletion.isConfirming}
        title="Delete this ride?"
        description="It will be removed from your ride history for good, and for anyone who rode with you. This cannot be undone."
        isPending={deletion.isPending}
        error={deletion.error}
        onCancel={deletion.cancel}
        onConfirm={deletion.confirm}
      />
    </main>
  )
}
