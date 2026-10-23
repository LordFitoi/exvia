'use client'

import { useConfirmedDeletion } from '@/hooks/useConfirmedDeletion'
import type { ConfirmedDeletion } from '@/hooks/useConfirmedDeletion'
import { deletePlaceLocation } from '@/services/placeLocationsApi'

const DELETE_FAILED_MESSAGE = 'The place could not be deleted. Check your connection and try again.'

interface PlaceDeletionOptions {
  placeId: number
  onDeleted: () => void
}

/** Asks first, then deletes the saved place. */
export const usePlaceDeletion = ({ placeId, onDeleted }: PlaceDeletionOptions): ConfirmedDeletion =>
  useConfirmedDeletion({
    targetId: placeId,
    remove: deletePlaceLocation,
    failureMessage: DELETE_FAILED_MESSAGE,
    onDeleted,
  })
