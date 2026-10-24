'use client'

import EventDetails from '@/components/clan/EventDetails'
import NoticeRouteLink from '@/components/clan/NoticeRouteLink'
import { useAuth } from '@/hooks/useAuth'
import { formatRelativeTime } from '@/services/formatRelativeTime'
import type { ClanNotice } from '@/types/clan'

const INITIALS_LENGTH = 2

interface NoticeCardProps {
  notice: ClanNotice
  /** Shows the clan's name next to the age; off inside the clan itself. */
  isClanShown: boolean
  /** Called when the author taps Edit; only the author sees that button. */
  onEdit: (notice: ClanNotice) => void
}

export default function NoticeCard({ notice, isClanShown, onEdit }: NoticeCardProps) {
  const { user } = useAuth()
  const { author, clan_name, created_at, title, description, route, event } = notice
  const age = formatRelativeTime(created_at)
  const isAuthor = user?.id === author.id

  return (
    <article className="card stack-sm">
      <div className="notice-author">
        <span className="avatar" aria-hidden="true">
          {author.username.slice(0, INITIALS_LENGTH).toUpperCase()}
        </span>
        <div>
          <p className="text-subtitle">{author.username}</p>
          <p className="text-caption">{isClanShown ? `${clan_name} · ${age}` : age}</p>
        </div>
        {isAuthor && (
          <button
            className="icon-button"
            type="button"
            aria-label={`Edit notice ${title}`}
            onClick={() => onEdit(notice)}
          >
            <span className="icon icon-edit" aria-hidden="true"></span>
          </button>
        )}
      </div>
      <h3 className="text-subtitle">{title}</h3>
      <p className="text-small">{description}</p>
      {route && <NoticeRouteLink route={route} />}
      {event && <EventDetails event={event} />}
    </article>
  )
}
