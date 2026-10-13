'use client'

import { useCallback, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import TabBar from '@/components/layout/TabBar'
import { TabBarContext } from '@/context/TabBarContext'
import type { TabBarContextValue } from '@/context/TabBarContext'

interface AppShellProps {
  children: ReactNode
}

/** The phone-width column of the logged-in app: the current screen and the bottom tab bar. */
export default function AppShell({ children }: AppShellProps) {
  // A count, not a flag: screens that open from one another each hold the bar hidden, and it
  // returns only when the last hold is released.
  const [holdCount, setHoldCount] = useState(0)
  const hide = useCallback(() => {
    setHoldCount((previous) => previous + 1)
    return () => setHoldCount((previous) => previous - 1)
  }, [])
  const value = useMemo<TabBarContextValue>(() => ({ hide }), [hide])

  return (
    <TabBarContext.Provider value={value}>
      <div className="app-shell">
        {children}
        {holdCount === 0 && <TabBar />}
      </div>
    </TabBarContext.Provider>
  )
}
