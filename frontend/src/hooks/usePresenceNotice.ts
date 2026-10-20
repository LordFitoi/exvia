'use client'

import { useCallback, useRef, useState } from 'react'

import type { PresenceHandler } from '@/hooks/useGroupChannel'
import { describePresence } from '@/services/riderPresence'
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
 * under the "ana left" of the leader who handed over by leaving.
 */
export const usePresenceNotice = (participants: readonly GroupParticipant[]): PresenceNoticeHandle => {
  const [notices, setNotices] = useState<readonly PresenceNotice[]>([])
  const nextId = useRef(0)

  const announce = useCallback((message: string, iconClass = DEFAULT_ICON_CLASS) => {
    nextId.current += 1
    const incoming = { id: nextId.current, message, iconClass }
    setNotices((previous) => appendNotice(previous, incoming))
  }, [])

  const handlePresence = useCallback<PresenceHandler>(
    (userId, status) => {
      const message = describePresence(participants, userId, status)
      if (message) announce(message)
    },
    [participants, announce],
  )
  const dismiss = useCallback(() => setNotices((previous) => previous.slice(1)), [])

  return { notice: notices[0] ?? null, dismiss, announce, handlePresence }
}
