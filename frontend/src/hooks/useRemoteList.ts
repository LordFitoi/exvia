'use client'

import { useEffect, useState } from 'react'

type RemoteListStatus = 'loading' | 'ready' | 'failed'

interface RemoteListState<TItem> {
  readonly status: RemoteListStatus
  readonly items: readonly TItem[]
}

interface RemoteList<TItem> extends RemoteListState<TItem> {
  reload: () => void
}

/** Loads a list when the screen mounts, whenever `fetchItems` changes and on `reload`. `fetchItems` must be stable. */
export const useRemoteList = <TItem>(
  fetchItems: () => Promise<TItem[]>,
  failureLabel: string,
): RemoteList<TItem> => {
  const [state, setState] = useState<RemoteListState<TItem>>({ status: 'loading', items: [] })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let isCancelled = false
    const load = async () => {
      try {
        const items = await fetchItems()
        if (!isCancelled) setState({ status: 'ready', items })
      } catch (error) {
        console.error(failureLabel, error)
        if (!isCancelled) setState({ status: 'failed', items: [] })
      }
    }
    load()
    return () => {
      isCancelled = true
    }
  }, [fetchItems, failureLabel, attempt])

  const reload = () => {
    setState({ status: 'loading', items: [] })
    setAttempt((previous) => previous + 1)
  }

  return { ...state, reload }
}
