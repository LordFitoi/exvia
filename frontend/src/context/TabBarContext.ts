'use client'

import { createContext } from 'react'

export interface TabBarContextValue {
  readonly setIsHidden: (isHidden: boolean) => void
}

export const TabBarContext = createContext<TabBarContextValue | null>(null)
