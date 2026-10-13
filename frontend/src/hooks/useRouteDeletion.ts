'use client'

import { useState } from 'react'

import { ApiError } from '@/services/apiClient'
import { deleteRoute } from '@/services/routesApi'

const DELETE_FAILED_MESSAGE = 'The route could not be deleted. Check your connection and try again.'

interface RouteDeletionOptions {
  /** The route to delete, or null when none is selected. */
  routeId: number | null
  onDeleted: () => void
}

interface RouteDeletion {
  isConfirming: boolean
  isPending: boolean
  error: string | null
  requestDeletion: () => void
  cancel: () => void
  confirm: () => Promise<void>
}

/** Delete in two steps: ask first, then delete. A failure keeps the question open with a message. */
export const useRouteDeletion = ({ routeId, onDeleted }: RouteDeletionOptions): RouteDeletion => {
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
    if (routeId === null) return
    setIsPending(true)
    setError(null)
    try {
      await deleteRoute(routeId)
      setIsConfirming(false)
      onDeleted()
    } catch (failure) {
      console.error(`Could not delete route ${routeId}`, failure)
      setError(failure instanceof ApiError ? failure.message : DELETE_FAILED_MESSAGE)
    } finally {
      setIsPending(false)
    }
  }

  return { isConfirming, isPending, error, requestDeletion, cancel, confirm }
}
