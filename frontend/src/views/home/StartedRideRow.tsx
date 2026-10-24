import RiderAvatar from '@/components/rider/RiderAvatar'
import type { ClanEventJoin } from '@/hooks/useClanEventJoin'
import { formatRelativeTime } from '@/services/formatRelativeTime'
import type { StartedRide } from '@/types/notification'

const STATUS_BADGES = {
  joined: { label: 'Joined', className: 'badge badge-success' },
  ended: { label: 'Ended', className: 'badge' },
} as const

interface StartedRideRowProps {
  ride: StartedRide
  rideJoin: ClanEventJoin
}

/** A clan ride that started: who leads it and, while it is open, the button that joins its group. */
export default function StartedRideRow({ ride, rideJoin }: StartedRideRowProps) {
  const { author, clan_name: clanName, event_title: title, scheduled_event: eventId, status } = ride
  const isPending = rideJoin.pendingEventId === eventId

  return (
    <li className="list-item list-item-stacked">
      <RiderAvatar rider={author} />
      <span className="list-item-body">
        <span className="list-item-title">{title} has started</span>
        <span className="list-item-meta">
          {clanName} · led by {author.username} · {formatRelativeTime(ride.created_at)}
        </span>
      </span>
      {status === 'open' ? (
        <button
          className={`button button-primary button-sm${isPending ? ' button-loading' : ''}`}
          type="button"
          disabled={rideJoin.pendingEventId !== null}
          aria-busy={isPending}
          onClick={() => rideJoin.join(eventId)}
        >
          Join ride
        </button>
      ) : (
        <span className={STATUS_BADGES[status].className}>{STATUS_BADGES[status].label}</span>
      )}
    </li>
  )
}
