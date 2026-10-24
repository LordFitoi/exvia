'use client'

import { useEffect, useState } from 'react'

import { buildDraftPoints } from '@/services/draftPoints'
import type { DraftPoint, Waypoint } from '@/types/route'

type InitialDraftStatus = 'loading' | 'ready' | 'failed'

interface InitialDraftState {
  readonly status: InitialDraftStatus
  readonly points: readonly DraftPoint[]
}

interface InitialDraftPoints extends InitialDraftState {
  retry: () => void
}

const LOADING_STATE: InitialDraftState = { status: 'loading', points: [] }
const FAILED_STATE: InitialDraftState = { status: 'failed', points: [] }

/** Routes the legs between the waypoints of a saved route, so it can be edited as a draft. */
export const useInitialDraftPoints = (
  accessToken: string | undefined,
  waypoints: readonly Waypoint[],
): InitialDraftPoints => {
  const [state, setState] = useState<InitialDraftState>(LOADING_STATE)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!accessToken) return
    const controller = new AbortController()
    const load = async () => {
      try {
        const points = await buildDraftPoints(waypoints, { accessToken, signal: controller.signal })
        setState(points ? { status: 'ready', points } : FAILED_STATE)
      } catch (error) {
        if (controller.signal.aborted) return
        console.error('Could not route the saved route', error)
        setState(FAILED_STATE)
      }
    }
    load()
    return () => controller.abort()
  }, [accessToken, waypoints, attempt])

  const retry = () => {
    setState(LOADING_STATE)
    setAttempt((previous) => previous + 1)
  }

  return { ...(accessToken ? state : FAILED_STATE), retry }
}
