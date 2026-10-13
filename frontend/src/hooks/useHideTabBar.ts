'use client'

import { useContext, useEffect } from 'react'

import { TabBarContext } from '@/context/TabBarContext'

/**
 * Hides the bottom tab bar while the calling screen is mounted and `isHidden` is true. Holds from
 * several screens add up: the bar comes back only when none of them hides it.
 */
export const useHideTabBar = (isHidden: boolean): void => {
  const context = useContext(TabBarContext)
  if (!context) throw new Error('useHideTabBar must be used within AppShell')
  const { hide } = context

  useEffect(() => {
    if (!isHidden) return
    return hide()
  }, [isHidden, hide])
}
