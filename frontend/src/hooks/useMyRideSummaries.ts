'use client'

import { useEffect, useState } from 'react'

import { fetchRideSummaries } from '@/services/rideSummariesApi'
import type { RideSummaryListItem } from '@/types/rideSummary'

type MyRideSummariesStatus = 'loading' | 'ready' | 'failed'

interface MyRideSummariesState {
  readonly status: MyRideSummariesStatus
  readonly summaries: readonly RideSummaryListItem[]
}

interface MyRideSummaries extends MyRideSummariesState {
  reload: () => void
}

const LOADING_STATE: MyRideSummariesState = { status: 'loading', summaries: [] }
const FAILED_STATE: MyRideSummariesState = { status: 'failed', summaries: [] }

/** The rides the signed-in user took part in, most recently saved first, loaded when the screen mounts. */
export const useMyRideSummaries = (): MyRideSummaries => {
  const [state, setState] = useState<MyRideSummariesState>(LOADING_STATE)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let isCancelled = false
    const load = async () => {
      try {
        const summaries = await fetchRideSummaries()
        if (!isCancelled) setState({ status: 'ready', summaries })
      } catch (error) {
        console.error('Could not load the ride history', error)
        if (!isCancelled) setState(FAILED_STATE)
      }
    }
    load()
    return () => {
      isCancelled = true
    }
  }, [attempt])

  const reload = () => {
    setState(LOADING_STATE)
    setAttempt((previous) => previous + 1)
  }

  return { ...state, reload }
}
