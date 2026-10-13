'use client'

import { useEffect, useState } from 'react'

import { fetchRoutes } from '@/services/routesApi'
import type { RouteSummary } from '@/types/route'

type MyRoutesStatus = 'loading' | 'ready' | 'failed'

interface MyRoutesState {
  readonly status: MyRoutesStatus
  readonly routes: readonly RouteSummary[]
}

interface MyRoutes extends MyRoutesState {
  reload: () => void
}

const LOADING_STATE: MyRoutesState = { status: 'loading', routes: [] }
const FAILED_STATE: MyRoutesState = { status: 'failed', routes: [] }

/** The signed-in user's routes, newest first, loaded when the screen mounts. */
export const useMyRoutes = (): MyRoutes => {
  const [state, setState] = useState<MyRoutesState>(LOADING_STATE)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let isCancelled = false
    const load = async () => {
      try {
        const routes = await fetchRoutes()
        if (!isCancelled) setState({ status: 'ready', routes })
      } catch (error) {
        console.error('Could not load the routes', error)
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
