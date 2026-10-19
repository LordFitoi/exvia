'use client'

import { useEffect, useState } from 'react'

import { fetchRouteGroup } from '@/services/routeGroupApi'
import type { RouteGroup } from '@/types/routeGroup'

type RouteGroupStatus = 'idle' | 'loading' | 'ready' | 'failed'

interface RouteGroupHandle {
  status: RouteGroupStatus
  group: RouteGroup | null
  retry: () => void
}

interface Outcome {
  readonly groupId: string
  readonly group: RouteGroup | null
}

/** Loads a group the rider was taken into (not one they just created), by its id; idle without an id. */
export const useRouteGroup = (groupId: string | undefined): RouteGroupHandle => {
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (groupId === undefined) return
    let isCancelled = false
    const load = async () => {
      try {
        const group = await fetchRouteGroup(groupId)
        if (!isCancelled) setOutcome({ groupId, group })
      } catch (error) {
        console.error(`Could not load the group ${groupId}`, error)
        if (!isCancelled) setOutcome({ groupId, group: null })
      }
    }
    load()
    return () => {
      isCancelled = true
    }
  }, [groupId, attempt])

  const retry = () => {
    setOutcome(null)
    setAttempt((previous) => previous + 1)
  }
  const current = outcome?.groupId === groupId ? outcome : null
  const getStatus = (): RouteGroupStatus => {
    if (groupId === undefined) return 'idle'
    if (current === null) return 'loading'
    return current.group ? 'ready' : 'failed'
  }

  return { status: getStatus(), group: current?.group ?? null, retry }
}
