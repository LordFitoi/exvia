'use client'

import { useCallback, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { LiveGroupContext } from '@/context/LiveGroupContext'
import { fetchRouteGroup } from '@/services/routeGroupApi'
import type { RouteGroup } from '@/types/routeGroup'

interface LiveGroupProviderProps {
  initialGroup: RouteGroup
  children: ReactNode
}

/** Keeps the group of the ride up to date for every part of the ride screen, starting from the one that was loaded. */
export default function LiveGroupProvider({ initialGroup, children }: LiveGroupProviderProps) {
  const [group, setGroup] = useState(initialGroup)
  const groupId = initialGroup.id

  const reloadGroup = useCallback(() => {
    const reload = async () => {
      try {
        setGroup(await fetchRouteGroup(groupId))
      } catch (error) {
        console.error(`Could not reload the group ${groupId}`, error)
      }
    }
    reload()
  }, [groupId])

  const value = useMemo(() => ({ group, replaceGroup: setGroup, reloadGroup }), [group, reloadGroup])

  return <LiveGroupContext.Provider value={value}>{children}</LiveGroupContext.Provider>
}
