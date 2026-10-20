'use client'

import { useState } from 'react'

import { ApiError } from '@/services/apiClient'
import { changeGroupRoute } from '@/services/routeGroupApi'
import type { RideSelection } from '@/types/rideSelection'
import type { RouteGroup } from '@/types/routeGroup'

const CHANGE_FAILED_MESSAGE = 'The route could not be changed. Check your connection and try again.'

interface GroupRouteChange {
  readonly isPending: boolean
  /** Why the last change failed; cleared by the next one. */
  readonly error: string | null
  readonly change: (selection: RideSelection) => void
}

/** The leader changes the route of the group while it rides; `onChanged` gets the group the server answered. */
export const useGroupRouteChange = (
  groupId: string,
  onChanged: (group: RouteGroup) => void,
): GroupRouteChange => {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const change = (selection: RideSelection) => {
    const save = async () => {
      setIsPending(true)
      setError(null)
      try {
        onChanged(await changeGroupRoute(groupId, selection.kind === 'route' ? selection.id : null))
      } catch (failure) {
        console.error(`Could not change the route of the group ${groupId}`, failure)
        setError(failure instanceof ApiError ? failure.message : CHANGE_FAILED_MESSAGE)
      } finally {
        setIsPending(false)
      }
    }
    save()
  }

  return { isPending, error, change }
}
