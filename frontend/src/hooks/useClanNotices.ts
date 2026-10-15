'use client'

import { useCallback } from 'react'

import { useRemoteList } from '@/hooks/useRemoteList'
import { fetchClanNotices } from '@/services/clansApi'

const FAILURE_LABEL = 'Could not load the clan notices'

/** The notices of one clan, newest first. */
export const useClanNotices = (clanId: number) => {
  const fetchNotices = useCallback(() => fetchClanNotices(clanId), [clanId])
  return useRemoteList(fetchNotices, FAILURE_LABEL)
}
