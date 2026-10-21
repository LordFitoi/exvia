'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import type { PresenceHandler } from '@/hooks/useGroupChannel'
import { describePresence, PRESENCE_GRACE_MS } from '@/services/riderPresence'
import type { GroupParticipant } from '@/types/routeGroup'

/** A message to show once; a new `id` restarts the toast even when the text repeats. */
export interface PresenceNotice {
  readonly id: number
  readonly message: string
  /** The icon class in front of the message. */
  readonly iconClass: string
}

const DEFAULT_ICON_CLASS = 'icon-users'
// The notices waiting behind the one on screen; when more pile up the oldest waiting one is dropped.
const MAX_WAITING_NOTICES = 3

interface PresenceNoticeHandle {
  /** The notice on screen until it is dismissed; the others wait their turn, in the order they came. */
  readonly notice: PresenceNotice | null
  readonly dismiss: () => void
  /** Shows a message of the ride itself, such as the rider losing their place or becoming the leader. */
  readonly announce: (message: string, iconClass?: string) => void
  readonly handlePresence: PresenceHandler
}

const appendNotice = (notices: readonly PresenceNotice[], incoming: PresenceNotice): readonly PresenceNotice[] => {
  const [showing, ...waiting] = notices
  if (!showing) return [incoming]
  return [showing, ...waiting.slice(-(MAX_WAITING_NOTICES - 1)), incoming]
}

/**
 * Turns the joins and leaves heard on the group channel, and the news of the ride, into one notice at a
 * time. A notice that arrives while another is showing waits, so "You lead the ride now" is not lost
 * under the "ana left" of the leader who handed over by leaving. A "left" is held for `PRESENCE_GRACE_MS`: a
 * rider who signs in again meanwhile (a locked screen, another app) never left, so neither toast is shown.
 */
export const usePresenceNotice = (participants: readonly GroupParticipant[]): PresenceNoticeHandle => {
  const [notices, setNotices] = useState<readonly PresenceNotice[]>([])
  const nextId = useRef(0)
  const pendingLeaves = useRef(new Map<number, ReturnType<typeof setTimeout>>())

  useEffect(() => {
    const pending = pendingLeaves.current
    return () => {
      pending.forEach(clearTimeout)
      pending.clear()
    }
  }, [])

  const announce = useCallback((message: string, iconClass = DEFAULT_ICON_CLASS) => {
    nextId.current += 1
    const incoming = { id: nextId.current, message, iconClass }
    setNotices((previous) => appendNotice(previous, incoming))
  }, [])

  const handlePresence = useCallback<PresenceHandler>(
    (userId, status) => {
      const pending = pendingLeaves.current.get(userId)
      clearTimeout(pending)
      pendingLeaves.current.delete(userId)
      if (pending !== undefined && status === 'joined') return
      // Read now: when the grace ends a rider who really left is gone from the participants.
      const message = describePresence(participants, userId, status)
      if (!message) return
      if (status === 'joined') return announce(message)
      const timer = setTimeout(() => {
        pendingLeaves.current.delete(userId)
        announce(message)
      }, PRESENCE_GRACE_MS)
      pendingLeaves.current.set(userId, timer)
    },
    [participants, announce],
  )
  const dismiss = useCallback(() => setNotices((previous) => previous.slice(1)), [])

  return { notice: notices[0] ?? null, dismiss, announce, handlePresence }
}
