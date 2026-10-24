'use client'

import { useCallback } from 'react'

import { useRemoteList } from '@/hooks/useRemoteList'
import { fetchClanEvents } from '@/services/clansApi'

const FAILURE_LABEL = 'Could not load the clan events'

/** The scheduled rides of one clan, latest first. */
export const useClanEvents = (clanId: number) => {
  const fetchEvents = useCallback(() => fetchClanEvents(clanId), [clanId])
  return useRemoteList(fetchEvents, FAILURE_LABEL)
}
