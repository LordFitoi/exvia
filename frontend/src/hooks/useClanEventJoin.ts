'use client'

import { useState } from 'react'

import { ApiError } from '@/services/apiClient'
import { joinClanEvent } from '@/services/clansApi'

const JOIN_FAILED_MESSAGE = 'Could not join the ride. Check your connection and try again.'

export interface ClanEventJoin {
  /** The event being joined, or null. */
  readonly pendingEventId: number | null
  readonly error: string | null
  join: (eventId: number) => Promise<void>
}

/** Joins the group of a clan ride that started, one at a time; `onJoined` gets the group to ride in. */
export const useClanEventJoin = (onJoined: (groupId: string) => void): ClanEventJoin => {
  const [pendingEventId, setPendingEventId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const join = async (eventId: number) => {
    setPendingEventId(eventId)
    setError(null)
    try {
      onJoined(await joinClanEvent(eventId))
    } catch (failure) {
      console.error(`Could not join the clan ride ${eventId}`, failure)
      setError(failure instanceof ApiError && failure.status !== 0 ? failure.message : JOIN_FAILED_MESSAGE)
    } finally {
      setPendingEventId(null)
    }
  }

  return { pendingEventId, error, join }
}
