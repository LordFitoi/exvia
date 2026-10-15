'use client'

import { useCallback } from 'react'

import { useRemoteList } from '@/hooks/useRemoteList'
import { fetchClan } from '@/services/clansApi'

const FAILURE_LABEL = 'Could not load the clan members'

/** The members of one clan. */
export const useClanMembers = (clanId: number) => {
  const fetchMembers = useCallback(async () => [...(await fetchClan(clanId)).members], [clanId])
  return useRemoteList(fetchMembers, FAILURE_LABEL)
}
