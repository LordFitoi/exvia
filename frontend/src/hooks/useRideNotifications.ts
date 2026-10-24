'use client'

import { useEffect, useState } from 'react'

import { useLiveNotifications } from '@/hooks/useLiveNotifications'
import { fetchRideNotifications } from '@/services/notificationsApi'
import type { RideNotification } from '@/types/notification'

type NotificationsStatus = 'loading' | 'ready' | 'failed'

interface NotificationsState {
  readonly status: NotificationsStatus
  readonly notifications: readonly RideNotification[]
}

interface RideNotifications extends NotificationsState {
  /** How many invitations wait for an answer, plus the clan rides the caller can still join. */
  readonly pendingCount: number
  reload: () => void
}

const LOADING_STATE: NotificationsState = { status: 'loading', notifications: [] }
const FAILED_STATE: NotificationsState = { status: 'failed', notifications: [] }

/**
 * The caller's invitations to ride and clan rides that started, loaded when the screen mounts and again whenever the app comes
 * back to the foreground or a new notification is heard, so one that arrived meanwhile shows up. A refresh that fails keeps the
 * list that is already shown instead of replacing it with an error.
 */
export const useRideNotifications = (): RideNotifications => {
  const [state, setState] = useState<NotificationsState>(LOADING_STATE)
  const [attempt, setAttempt] = useState(0)
  const latestNotificationId = useLiveNotifications().latest?.id

  useEffect(() => {
    let isCancelled = false
    const load = async () => {
      try {
        const notifications = await fetchRideNotifications()
        if (!isCancelled) setState({ status: 'ready', notifications })
      } catch (error) {
        console.error('Could not load the invitations', error)
        if (!isCancelled) setState((previous) => (previous.status === 'ready' ? previous : FAILED_STATE))
      }
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') load()
    }
    load()
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      isCancelled = true
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [attempt, latestNotificationId])

  const pendingCount = state.notifications.filter(
    (notification) => notification.status === 'invited' || notification.status === 'open',
  ).length
  const reload = () => setAttempt((previous) => previous + 1)

  return { ...state, pendingCount, reload }
}
