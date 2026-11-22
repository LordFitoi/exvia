'use client'

import { createContext } from 'react'

import type { LiveNotification } from '@/services/notificationMessages'

export interface LiveNotificationContextValue {
  /** The latest notification heard while the app was open, or null if none yet. A new `id` means a new one. */
  readonly latest: LiveNotification | null
  /** True after the rider tapped a notification of the phone, until the screen that shows the list has opened it. */
  readonly isListRequested: boolean
  readonly clearListRequest: () => void
}

export const LiveNotificationContext = createContext<LiveNotificationContextValue | null>(null)
