'use client'

import { useContext, useEffect } from 'react'

import { TabBarContext } from '@/context/TabBarContext'

/** Hides the bottom tab bar while the calling screen is mounted and `isHidden` is true. */
export const useHideTabBar = (isHidden: boolean): void => {
  const context = useContext(TabBarContext)
  if (!context) throw new Error('useHideTabBar must be used within AppShell')
  const { setIsHidden } = context

  useEffect(() => {
    setIsHidden(isHidden)
    return () => setIsHidden(false)
  }, [isHidden, setIsHidden])
}
