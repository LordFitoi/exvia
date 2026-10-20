'use client'

import { createContext } from 'react'

import type { LiveNotification } from '@/services/notificationMessages'

export interface LiveNotificationContextValue {
  /** The latest notification heard while the app was open, or null if none yet. A new `id` means a new one. */
  readonly latest: LiveNotification | null
}

export const LiveNotificationContext = createContext<LiveNotificationContextValue | null>(null)
