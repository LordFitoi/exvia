'use client'

import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import TabBar from '@/components/layout/TabBar'
import { TabBarContext } from '@/context/TabBarContext'
import type { TabBarContextValue } from '@/context/TabBarContext'

interface AppShellProps {
  children: ReactNode
}

/** The phone-width column of the logged-in app: the current screen and the bottom tab bar. */
export default function AppShell({ children }: AppShellProps) {
  const [isTabBarHidden, setIsTabBarHidden] = useState(false)
  const value = useMemo<TabBarContextValue>(() => ({ setIsHidden: setIsTabBarHidden }), [])

  return (
    <TabBarContext.Provider value={value}>
      <div className="app-shell">
        {children}
        {!isTabBarHidden && <TabBar />}
      </div>
    </TabBarContext.Provider>
  )
}
