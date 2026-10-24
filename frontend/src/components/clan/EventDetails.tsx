'use client'

import { useRouter } from 'next/navigation'

import { useClanEventJoin } from '@/hooks/useClanEventJoin'
import { formatEventTime } from '@/services/eventDate'
import type { ClanEvent, ClanEventState } from '@/types/clan'

const STATE_BADGES: Record<ClanEventState, { label: string; className: string }> = {
  upcoming: { label: 'Upcoming', className: 'badge badge-primary' },
  live: { label: 'Live', className: 'badge badge-success' },
  ended: { label: 'Ended', className: 'badge' },
}

interface EventDetailsProps {
  event: ClanEvent
}

/** When a clan ride starts, its state, and, while it is live, the button that joins its group. */
export default function EventDetails({ event }: EventDetailsProps) {
  const router = useRouter()
  const { pendingEventId, error, join } = useClanEventJoin((groupId) => router.push(`/ride/${groupId}`))
  const { label, className } = STATE_BADGES[event.state]
  const isPending = pendingEventId === event.id

  return (
    <div className="stack-sm">
      <div className="ride-meta">
        <span className="ride-meta-row">
          <span className="icon icon-sm icon-calendar" aria-hidden="true"></span>
          {formatEventTime(event.scheduled_at)}
        </span>
      </div>
      <div className="ride-footer">
        <span className={className}>{label}</span>
        {event.state === 'live' && (
          <button
            className={`button button-primary${isPending ? ' button-loading' : ''}`}
            type="button"
            disabled={pendingEventId !== null}
            aria-busy={isPending}
            onClick={() => join(event.id)}
          >
            {event.is_joined ? 'Open ride' : 'Join ride'}
          </button>
        )}
      </div>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
