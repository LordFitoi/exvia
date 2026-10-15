'use client'

import { useState } from 'react'

import { ApiError } from '@/services/apiClient'

interface ConfirmedDeletionOptions {
  /** The record to delete, or null when none is selected. */
  targetId: number | null
  /** Deletes the record on the server. */
  remove: (id: number) => Promise<void>
  /** Shown when the failure has no message of its own. */
  failureMessage: string
  onDeleted: () => void
}

export interface ConfirmedDeletion {
  isConfirming: boolean
  isPending: boolean
  error: string | null
  requestDeletion: () => void
  cancel: () => void
  confirm: () => Promise<void>
}

/** Delete in two steps: ask first, then delete. A failure keeps the question open with a message. */
export const useConfirmedDeletion = ({
  targetId,
  remove,
  failureMessage,
  onDeleted,
}: ConfirmedDeletionOptions): ConfirmedDeletion => {
  const [isConfirming, setIsConfirming] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const requestDeletion = () => {
    setError(null)
    setIsConfirming(true)
  }

  const cancel = () => {
    if (!isPending) setIsConfirming(false)
  }

  const confirm = async () => {
    if (targetId === null) return
    setIsPending(true)
    setError(null)
    try {
      await remove(targetId)
      setIsConfirming(false)
      onDeleted()
    } catch (failure) {
      console.error(`Could not delete ${targetId}`, failure)
      setError(failure instanceof ApiError ? failure.message : failureMessage)
    } finally {
      setIsPending(false)
    }
  }

  return { isConfirming, isPending, error, requestDeletion, cancel, confirm }
}
