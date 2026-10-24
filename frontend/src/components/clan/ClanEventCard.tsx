import EventDetails from '@/components/clan/EventDetails'
import NoticeRouteLink from '@/components/clan/NoticeRouteLink'
import { formatEventDay, formatEventMonth } from '@/services/eventDate'
import type { ClanEvent } from '@/types/clan'

interface ClanEventCardProps {
  event: ClanEvent
  /** Shows the clan's name under the title; off inside the clan itself. */
  isClanShown?: boolean
}

/** A scheduled clan ride as a ride card: date block, title, description, route and the join button. */
export default function ClanEventCard({ event, isClanShown = false }: ClanEventCardProps) {
  const { title, description, scheduled_at: scheduledAt, route, clan_name: clanName } = event

  return (
    <article className="card ride-card">
      <div className="ride-head">
        <div className="ride-date">
          <span className="ride-date-day data">{formatEventDay(scheduledAt)}</span>
          <span className="ride-date-month">{formatEventMonth(scheduledAt)}</span>
        </div>
        <div className="stack-sm">
          <h3 className="text-subtitle">{title}</h3>
          {isClanShown && (
            <span className="ride-meta-row text-caption">
              <span className="icon icon-sm icon-users" aria-hidden="true"></span>
              {clanName}
            </span>
          )}
          <p className="text-small">{description}</p>
        </div>
      </div>
      {route && <NoticeRouteLink route={route} />}
      <EventDetails event={event} />
    </article>
  )
}
