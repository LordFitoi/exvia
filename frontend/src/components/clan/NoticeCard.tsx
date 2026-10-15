import { formatRelativeTime } from '@/services/formatRelativeTime'
import type { ClanNotice } from '@/types/clan'

const INITIALS_LENGTH = 2

interface NoticeCardProps {
  notice: ClanNotice
  /** Shows the clan's name next to the age; off inside the clan itself. */
  isClanShown: boolean
}

export default function NoticeCard({ notice, isClanShown }: NoticeCardProps) {
  const { author, clan_name, created_at, title, description } = notice
  const age = formatRelativeTime(created_at)

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
      </div>
      <h3 className="text-subtitle">{title}</h3>
      <p className="text-small">{description}</p>
    </article>
  )
}
