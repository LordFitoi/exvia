import LoadFailedState from '@/components/feedback/LoadFailedState'
import StateView from '@/components/feedback/StateView'
import type { Clan } from '@/types/clan'

const SKELETON_ROW_IDS = [1, 2, 3] as const

interface ClanListProps {
  status: 'loading' | 'ready' | 'failed'
  clans: readonly Clan[]
  onSelect: (clan: Clan) => void
  onRetry: () => void
}

/** The clans the user belongs to, one row each; opening one shows its notices and members. */
export default function ClanList({ status, clans, onSelect, onRetry }: ClanListProps) {
  if (status === 'failed') return <LoadFailedState title="Could not load your clans" onRetry={onRetry} />

  if (status === 'loading') {
    return (
      <ul className="list" aria-busy="true" aria-label="Loading clans">
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

  if (clans.length === 0) {
    return (
      <StateView
        title="No clans yet"
        description="Create a clan, or accept an invitation to join one."
      >
        <span className="icon icon-lg icon-users"></span>
      </StateView>
    )
  }

  return (
    <ul className="list">
      {clans.map((clan) => (
        <li key={clan.id}>
          <button className="list-item" type="button" onClick={() => onSelect(clan)}>
            <span className="list-item-icon" aria-hidden="true">
              <span className="icon icon-users"></span>
            </span>
            <span className="list-item-body">
              <span className="list-item-title">{clan.name}</span>
              <span className="list-item-meta">{clan.description}</span>
            </span>
            <span className="icon icon-chevron-right" aria-hidden="true"></span>
          </button>
        </li>
      ))}
    </ul>
  )
}
