'use client'

import { useState } from 'react'

import NoticeCard from '@/components/clan/NoticeCard'
import NoticeFormDialog from '@/components/clan/NoticeFormDialog'
import LoadFailedState from '@/components/feedback/LoadFailedState'
import StateView from '@/components/feedback/StateView'
import type { ClanNotice } from '@/types/clan'

const SKELETON_ROW_IDS = [1, 2] as const

interface NoticeListProps {
  status: 'loading' | 'ready' | 'failed'
  notices: readonly ClanNotice[]
  isClanShown: boolean
  emptyTitle: string
  emptyDescription: string
  onRetry: () => void
  /** Called after the author saved an edit, to load the list again. */
  onEdited: () => void
}

function NoticeSkeleton() {
  return (
    <ul className="list" aria-busy="true" aria-label="Loading notices">
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

/** Notices as cards, newest first, with the loading, failed and empty states of the list. */
export default function NoticeList({
  status,
  notices,
  isClanShown,
  emptyTitle,
  emptyDescription,
  onRetry,
  onEdited,
}: NoticeListProps) {
  const [editing, setEditing] = useState<ClanNotice | null>(null)

  const handleSaved = () => {
    setEditing(null)
    onEdited()
  }

  if (status === 'loading') return <NoticeSkeleton />
  if (status === 'failed') return <LoadFailedState title="Could not load the notices" onRetry={onRetry} />

  if (notices.length === 0) {
    return (
      <StateView title={emptyTitle} description={emptyDescription}>
        <span className="icon icon-lg icon-bell"></span>
      </StateView>
    )
  }

  return (
    <div className="stack">
      {notices.map((notice) => (
        <NoticeCard key={notice.id} notice={notice} isClanShown={isClanShown} onEdit={setEditing} />
      ))}
      {editing && (
        <NoticeFormDialog
          clanId={editing.clan}
          notice={editing}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
