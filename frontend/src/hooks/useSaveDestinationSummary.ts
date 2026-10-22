'use client'

import { useState } from 'react'

import { ApiError } from '@/services/apiClient'
import { createDestinationSummary } from '@/services/rideSummariesApi'
import type { NewDestinationSummary } from '@/types/rideSummary'

const SAVE_FAILED_MESSAGE = 'Your ride could not be saved. Check your connection and try again, or close without saving.'

interface SaveDestinationSummaryOptions {
  summary: NewDestinationSummary
  /** Called once the ride is saved. */
  onSaved: () => void
}

interface SaveDestinationSummary {
  isPending: boolean
  /** Set when the last attempt failed; saving again tries once more. */
  error: string | null
  save: () => Promise<void>
}

/** Saves the summary of a ride to a place on the server, then calls `onSaved`. */
export const useSaveDestinationSummary = ({
  summary,
  onSaved,
}: SaveDestinationSummaryOptions): SaveDestinationSummary => {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = async () => {
    setIsPending(true)
    setError(null)
    try {
      await createDestinationSummary(summary)
      onSaved()
    } catch (failure) {
      console.error(`Could not save the ride to ${summary.destinationName}`, failure)
      setError(failure instanceof ApiError ? failure.message : SAVE_FAILED_MESSAGE)
      setIsPending(false)
    }
  }

  return { isPending, error, save }
}
