'use client'

import { useCallback, useRef, useState } from 'react'

import type { PresenceHandler } from '@/hooks/useGroupChannel'
import { describePresence } from '@/services/riderPresence'
import type { GroupParticipant } from '@/types/routeGroup'

/** A message to show once; a new `id` restarts the toast even when the text repeats. */
export interface PresenceNotice {
  readonly id: number
  readonly message: string
}

interface PresenceNoticeHandle {
  /** The latest rider to join or leave, until it is dismissed. */
  readonly notice: PresenceNotice | null
  readonly dismiss: () => void
  /** Shows a message of the ride itself, such as the rider losing their place. */
  readonly announce: (message: string) => void
  readonly handlePresence: PresenceHandler
}

/** Turns the joins and leaves heard on the group channel into one notice at a time. */
export const usePresenceNotice = (participants: readonly GroupParticipant[]): PresenceNoticeHandle => {
  const [notice, setNotice] = useState<PresenceNotice | null>(null)
  const nextId = useRef(0)

  const announce = useCallback((message: string) => {
    nextId.current += 1
    setNotice({ id: nextId.current, message })
  }, [])

  const handlePresence = useCallback<PresenceHandler>(
    (userId, status) => {
      const message = describePresence(participants, userId, status)
      if (message) announce(message)
    },
    [participants, announce],
  )
  const dismiss = useCallback(() => setNotice(null), [])

  return { notice, dismiss, announce, handlePresence }
}
