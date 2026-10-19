'use client'

import { useState } from 'react'

import { ApiError } from '@/services/apiClient'
import { createRouteGroup } from '@/services/routeGroupApi'
import type { NewRouteGroup, RouteGroup } from '@/types/routeGroup'

const START_FAILED_MESSAGE = 'Could not start the ride. Check your connection and try again.'

interface StartGroupRide {
  readonly isPending: boolean
  readonly error: string | null
  start: (request: NewRouteGroup) => Promise<void>
}

const describeFailure = (failure: unknown): string => {
  if (!(failure instanceof ApiError) || failure.status === 0) return START_FAILED_MESSAGE
  return failure.fieldErrors.invitees ?? failure.fieldErrors.route ?? failure.message
}

/** Creates the group of a ride, which also invites the riders; `onStarted` runs once it exists. */
export const useStartGroupRide = (onStarted: (group: RouteGroup) => void): StartGroupRide => {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const start = async (request: NewRouteGroup) => {
    setIsPending(true)
    setError(null)
    try {
      onStarted(await createRouteGroup(request))
    } catch (failure) {
      console.error('Could not create the ride group', failure)
      setError(describeFailure(failure))
    } finally {
      setIsPending(false)
    }
  }

  return { isPending, error, start }
}
