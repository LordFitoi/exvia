'use client'

import { useEffect, useState } from 'react'

import { fetchActiveGroup } from '@/services/routeGroupApi'
import type { RouteGroup } from '@/types/routeGroup'

interface ActiveGroup {
  /** The group the rider can join back, or null while loading, when there is none and when loading failed. */
  readonly group: RouteGroup | null
}

/**
 * The newest group the rider can join back, loaded when the screen mounts and again whenever the app comes back
 * to the foreground, since a group ends or starts while the app is away. A refresh that fails keeps what is shown.
 */
export const useActiveGroup = (): ActiveGroup => {
  const [group, setGroup] = useState<RouteGroup | null>(null)

  useEffect(() => {
    let isCancelled = false
    const load = async () => {
      try {
        const active = await fetchActiveGroup()
        if (!isCancelled) setGroup(active)
      } catch (error) {
        console.error('Could not load the active group', error)
      }
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') load()
    }
    load()
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      isCancelled = true
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return { group }
}
