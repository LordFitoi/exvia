'use client'

import { useState } from 'react'

import NoticeFormDialog from '@/components/clan/NoticeFormDialog'
import NoticeList from '@/components/clan/NoticeList'
import { useClanNotices } from '@/hooks/useClanNotices'

interface ClanNoticesPanelProps {
  clanId: number
}

/** The notices of a clan, newest first, with the button that posts a new one. */
export default function ClanNoticesPanel({ clanId }: ClanNoticesPanelProps) {
  const [isPosting, setIsPosting] = useState(false)
  const notices = useClanNotices(clanId)

  const handleSaved = () => {
    setIsPosting(false)
    notices.reload()
  }

  return (
    <section className="stack" aria-label="Notices">
      <button className="button button-primary button-block" type="button" onClick={() => setIsPosting(true)}>
        New notice
      </button>
      <NoticeList
        status={notices.status}
        notices={notices.items}
        isClanShown={false}
        emptyTitle="No notices yet"
        emptyDescription="Post the first notice for the members of this clan."
        onRetry={notices.reload}
        onEdited={notices.reload}
      />
      {isPosting && (
        <NoticeFormDialog clanId={clanId} onClose={() => setIsPosting(false)} onSaved={handleSaved} />
      )}
    </section>
  )
}
