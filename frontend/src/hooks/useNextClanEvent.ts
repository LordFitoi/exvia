'use client'

import { useEffect, useState } from 'react'

import { useLiveNotifications } from '@/hooks/useLiveNotifications'
import { fetchNextClanEvent } from '@/services/clansApi'
import type { ClanEvent } from '@/types/clan'

interface NextClanEvent {
  /** The next ride of the rider's clans, or null while loading, when there is none and when loading failed. */
  readonly event: ClanEvent | null
}

/**
 * The soonest upcoming or live ride of the rider's clans. It is loaded when the screen mounts, whenever the app
 * comes back to the foreground and whenever a notification is heard, so a ride that starts while Home is open
 * turns live (and gets its Join button) without a refresh. A refresh that fails keeps the ride already shown.
 */
export const useNextClanEvent = (): NextClanEvent => {
  const [event, setEvent] = useState<ClanEvent | null>(null)
  const latestNotificationId = useLiveNotifications().latest?.id

  useEffect(() => {
    let isCancelled = false
    const load = async () => {
      try {
        const next = await fetchNextClanEvent()
        if (!isCancelled) setEvent(next)
      } catch (error) {
        console.error('Could not load the next clan ride', error)
      }
    }
    const loadIfVisible = () => {
      if (document.visibilityState === 'visible') load()
    }
    load()
    document.addEventListener('visibilitychange', loadIfVisible)
    return () => {
      isCancelled = true
      document.removeEventListener('visibilitychange', loadIfVisible)
    }
  }, [latestNotificationId])

  return { event }
}
