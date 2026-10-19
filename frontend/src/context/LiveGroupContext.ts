'use client'

import { createContext } from 'react'

import type { RouteGroup } from '@/types/routeGroup'

export interface LiveGroupContextValue {
  /** The group being ridden, as last read from the server: its riders change while the ride goes on. */
  readonly group: RouteGroup
  /** Shows a group the server just answered, after the leader invited or removed a rider. */
  readonly replaceGroup: (group: RouteGroup) => void
  /** Reads the group again, to learn who joined, left or was invited since. */
  readonly reloadGroup: () => void
}

export const LiveGroupContext = createContext<LiveGroupContextValue | null>(null)
