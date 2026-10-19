'use client'

import { useEffect, useState } from 'react'

import { fetchActiveGroup } from '@/services/routeGroupApi'
import type { RouteGroup } from '@/types/routeGroup'

// A group ends 30 s after its last rider goes quiet (server side), so Home asks a few times within that.
const REFRESH_INTERVAL_MS = 10_000

interface ActiveGroup {
  /** The group the rider can join back, or null while loading, when there is none and when loading failed. */
  readonly group: RouteGroup | null
}

/**
 * The newest group the rider can join back. It is loaded when the screen mounts, whenever the app comes
 * back to the foreground, and every 10 seconds while the screen is visible, so a group whose riders have all
 * left disappears without leaving Home. A refresh that fails hides the group: it may well have ended.
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
        if (!isCancelled) setGroup(null)
      }
    }
    const loadIfVisible = () => {
      if (document.visibilityState === 'visible') load()
    }
    load()
    const timer = setInterval(loadIfVisible, REFRESH_INTERVAL_MS)
    document.addEventListener('visibilitychange', loadIfVisible)
    return () => {
      isCancelled = true
      clearInterval(timer)
      document.removeEventListener('visibilitychange', loadIfVisible)
    }
  }, [])

  return { group }
}
