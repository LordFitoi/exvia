import LoadFailedState from '@/components/feedback/LoadFailedState'
import type { ClanMember } from '@/types/clan'

const INITIALS_LENGTH = 2
const SKELETON_ROW_IDS = [1, 2, 3] as const

interface ClanMemberListProps {
  status: 'loading' | 'ready' | 'failed'
  members: readonly ClanMember[]
  onRetry: () => void
}

export default function ClanMemberList({ status, members, onRetry }: ClanMemberListProps) {
  if (status === 'failed') return <LoadFailedState title="Could not load the members" onRetry={onRetry} />

  if (status === 'loading') {
    return (
      <ul className="list" aria-busy="true" aria-label="Loading members">
        {SKELETON_ROW_IDS.map((id) => (
          <li className="list-item" key={id}>
            <span className="skeleton skeleton-avatar"></span>
            <span className="list-item-body">
              <span className="skeleton skeleton-title"></span>
            </span>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <ul className="list">
      {members.map(({ id, username }) => (
        <li className="list-item" key={id}>
          <span className="avatar" aria-hidden="true">
            {username.slice(0, INITIALS_LENGTH).toUpperCase()}
          </span>
          <span className="list-item-body">
            <span className="list-item-title">{username}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}
