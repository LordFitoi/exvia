'use client'

import { useContext } from 'react'

import { LiveNotificationContext } from '@/context/LiveNotificationContext'
import type { LiveNotificationContextValue } from '@/context/LiveNotificationContext'

export const useLiveNotifications = (): LiveNotificationContextValue => {
  const value = useContext(LiveNotificationContext)
  if (!value) throw new Error('useLiveNotifications must be used within LiveNotificationProvider')
  return value
}
