'use client'

import { useState } from 'react'

import { ApiError } from '@/services/apiClient'
import { acceptRouteInvitation, rejectRouteInvitation } from '@/services/routeGroupApi'

const ANSWER_FAILED_MESSAGE = 'The invitation could not be answered. Check your connection and try again.'

interface RouteInvitationAnswerOptions {
  /** Runs after the server took the rider into the group; they start riding in it. */
  onAccepted: (groupId: string) => void
  /** Runs after the server took the rejection. */
  onRejected: () => void
}

interface RouteInvitationAnswer {
  /** The group whose invitation is being answered, or null. */
  readonly pendingGroupId: string | null
  readonly error: string | null
  accept: (groupId: string) => Promise<void>
  reject: (groupId: string) => Promise<void>
}

/** Accepts or rejects an invitation to ride, one at a time. */
export const useRouteInvitationAnswer = ({
  onAccepted,
  onRejected,
}: RouteInvitationAnswerOptions): RouteInvitationAnswer => {
  const [pendingGroupId, setPendingGroupId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const answer = async (groupId: string, send: () => Promise<void>) => {
    setPendingGroupId(groupId)
    setError(null)
    try {
      await send()
    } catch (failure) {
      console.error(`Could not answer the invitation to group ${groupId}`, failure)
      setError(failure instanceof ApiError && failure.status !== 0 ? failure.message : ANSWER_FAILED_MESSAGE)
    } finally {
      setPendingGroupId(null)
    }
  }

  const accept = (groupId: string) =>
    answer(groupId, async () => {
      await acceptRouteInvitation(groupId)
      onAccepted(groupId)
    })

  const reject = (groupId: string) =>
    answer(groupId, async () => {
      await rejectRouteInvitation(groupId)
      onRejected()
    })

  return { pendingGroupId, error, accept, reject }
}
