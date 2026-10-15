'use client'

import { useConfirmedDeletion } from '@/hooks/useConfirmedDeletion'
import type { ConfirmedDeletion } from '@/hooks/useConfirmedDeletion'
import { deleteRideSummary } from '@/services/rideSummariesApi'

const DELETE_FAILED_MESSAGE = 'The ride could not be deleted. Check your connection and try again.'

interface RideSummaryDeletionOptions {
  summaryId: number
  onDeleted: () => void
}

/** Asks first, then deletes the ride from the history. */
export const useRideSummaryDeletion = ({
  summaryId,
  onDeleted,
}: RideSummaryDeletionOptions): ConfirmedDeletion =>
  useConfirmedDeletion({
    targetId: summaryId,
    remove: deleteRideSummary,
    failureMessage: DELETE_FAILED_MESSAGE,
    onDeleted,
  })
