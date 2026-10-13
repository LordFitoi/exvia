'use client'

import { createContext } from 'react'

export interface TabBarContextValue {
  /** Takes a hold that keeps the tab bar hidden; the returned function releases it. */
  readonly hide: () => () => void
}

export const TabBarContext = createContext<TabBarContextValue | null>(null)
