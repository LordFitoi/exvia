'use client'

import { useState } from 'react'

import { ApiError } from '@/services/apiClient'
import { acceptInvitation, declineInvitation } from '@/services/clansApi'

const ANSWER_FAILED_MESSAGE = 'The invitation could not be answered. Check your connection and try again.'

interface InvitationAnswer {
  /** The invitation being answered, or null. */
  readonly pendingId: number | null
  readonly error: string | null
  accept: (id: number) => Promise<void>
  decline: (id: number) => Promise<void>
}

/** Accepts or declines an invitation, one at a time; `onAnswered` runs after the server took the answer. */
export const useInvitationAnswer = (onAnswered: () => void): InvitationAnswer => {
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const answer = async (id: number, send: (id: number) => Promise<void>) => {
    setPendingId(id)
    setError(null)
    try {
      await send(id)
      onAnswered()
    } catch (failure) {
      console.error(`Could not answer invitation ${id}`, failure)
      setError(failure instanceof ApiError && failure.status !== 0 ? failure.message : ANSWER_FAILED_MESSAGE)
    } finally {
      setPendingId(null)
    }
  }

  return {
    pendingId,
    error,
    accept: (id) => answer(id, acceptInvitation),
    decline: (id) => answer(id, declineInvitation),
  }
}
