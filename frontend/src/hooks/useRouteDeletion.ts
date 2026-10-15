'use client'

import { useConfirmedDeletion } from '@/hooks/useConfirmedDeletion'
import type { ConfirmedDeletion } from '@/hooks/useConfirmedDeletion'
import { deleteRoute } from '@/services/routesApi'

const DELETE_FAILED_MESSAGE = 'The route could not be deleted. Check your connection and try again.'

interface RouteDeletionOptions {
  /** The route to delete, or null when none is selected. */
  routeId: string | null
  onDeleted: () => void
}

/** Asks first, then deletes the route. */
export const useRouteDeletion = ({ routeId, onDeleted }: RouteDeletionOptions): ConfirmedDeletion =>
  useConfirmedDeletion({
    targetId: routeId,
    remove: deleteRoute,
    failureMessage: DELETE_FAILED_MESSAGE,
    onDeleted,
  })
