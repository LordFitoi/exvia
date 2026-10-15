'use client'

import { useState } from 'react'

import { useHideTabBar } from '@/hooks/useHideTabBar'
import { useMyRideSummaries } from '@/hooks/useMyRideSummaries'
import RideSummaryList from '@/views/history/RideSummaryList'
import RideSummaryView from '@/views/history/RideSummaryView'

interface RideSummariesViewProps {
  onClose: () => void
}

/** The ride history: the rides the user took part in, newest first; opening one shows its summary. */
export default function RideSummariesView({ onClose }: RideSummariesViewProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const history = useMyRideSummaries()
  // A full-height screen with its own close button, so the tab bar steps aside.
  useHideTabBar(true)

  const handleDeleted = () => {
    setSelectedId(null)
    history.reload()
  }

  if (selectedId !== null) {
    return (
      <RideSummaryView
        summaryId={selectedId}
        onClose={() => setSelectedId(null)}
        onDeleted={handleDeleted}
      />
    )
  }

  return (
    <main className="screen-body">
      <div className="screen-header">
        <h1 className="text-heading">Ride history</h1>
        <button className="icon-button" type="button" aria-label="Close" onClick={onClose}>
          <span className="icon icon-x" aria-hidden="true"></span>
        </button>
      </div>
      <RideSummaryList
        status={history.status}
        summaries={history.summaries}
        onSelect={setSelectedId}
        onRetry={history.reload}
      />
    </main>
  )
}
