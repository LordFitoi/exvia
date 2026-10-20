'use client'

import { useEffect, useState } from 'react'

import { useLiveNotifications } from '@/hooks/useLiveNotifications'
import { fetchRouteInvitations } from '@/services/notificationsApi'
import type { RouteInvitation } from '@/types/notification'

type InvitationsStatus = 'loading' | 'ready' | 'failed'

interface InvitationsState {
  readonly status: InvitationsStatus
  readonly invitations: readonly RouteInvitation[]
}

interface RouteInvitations extends InvitationsState {
  /** How many are waiting for the caller's answer. */
  readonly pendingCount: number
  reload: () => void
}

const LOADING_STATE: InvitationsState = { status: 'loading', invitations: [] }
const FAILED_STATE: InvitationsState = { status: 'failed', invitations: [] }

/**
 * The caller's invitations to ride, loaded when the screen mounts and again whenever the app comes
 * back to the foreground or a new notification is heard, so one that arrived meanwhile shows up. A refresh that fails keeps the
 * list that is already shown instead of replacing it with an error.
 */
export const useRouteInvitations = (): RouteInvitations => {
  const [state, setState] = useState<InvitationsState>(LOADING_STATE)
  const [attempt, setAttempt] = useState(0)
  const latestNotificationId = useLiveNotifications().latest?.id

  useEffect(() => {
    let isCancelled = false
    const load = async () => {
      try {
        const invitations = await fetchRouteInvitations()
        if (!isCancelled) setState({ status: 'ready', invitations })
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

  const pendingCount = state.invitations.filter((invitation) => invitation.status === 'invited').length
  const reload = () => setAttempt((previous) => previous + 1)

  return { ...state, pendingCount, reload }
}
