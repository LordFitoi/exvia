'use client'

import { useEffect, useState } from 'react'

import { fetchRideSummary } from '@/services/rideSummariesApi'
import type { RideSummaryDetail } from '@/types/rideSummary'

type RideSummaryDetailStatus = 'loading' | 'ready' | 'failed'

interface RideSummaryDetailHandle {
  status: RideSummaryDetailStatus
  summary: RideSummaryDetail | null
  retry: () => void
}

/** Loads one ride with its participants and speeds. The status follows which id has loaded or failed. */
export const useRideSummaryDetail = (summaryId: number): RideSummaryDetailHandle => {
  const [loaded, setLoaded] = useState<RideSummaryDetail | null>(null)
  const [failedId, setFailedId] = useState<number | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let isCancelled = false
    const load = async () => {
      try {
        const summary = await fetchRideSummary(summaryId)
        if (!isCancelled) setLoaded(summary)
      } catch (error) {
        console.error(`Could not load ride ${summaryId}`, error)
        if (!isCancelled) setFailedId(summaryId)
      }
    }
    load()
    return () => {
      isCancelled = true
    }
  }, [summaryId, attempt])

  const retry = () => {
    setFailedId(null)
    setAttempt((previous) => previous + 1)
  }

  const isReady = loaded?.id === summaryId
  const getStatus = (): RideSummaryDetailStatus => {
    if (isReady) return 'ready'
    return failedId === summaryId ? 'failed' : 'loading'
  }

  return { status: getStatus(), summary: isReady ? loaded : null, retry }
}
