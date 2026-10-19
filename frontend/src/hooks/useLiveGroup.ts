'use client'

import { useContext } from 'react'

import { LiveGroupContext } from '@/context/LiveGroupContext'
import type { LiveGroupContextValue } from '@/context/LiveGroupContext'

export const useLiveGroup = (): LiveGroupContextValue => {
  const value = useContext(LiveGroupContext)
  if (!value) throw new Error('useLiveGroup must be used within LiveGroupProvider')
  return value
}
