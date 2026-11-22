'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import Toast from '@/components/feedback/Toast'
import { LiveNotificationContext } from '@/context/LiveNotificationContext'
import { useAuth } from '@/hooks/useAuth'
import { startNotificationConnection } from '@/services/notificationConnection'
import type { LiveNotification } from '@/services/notificationMessages'
import { startNotificationChecker } from '@/services/notificationChecker'

interface LiveNotificationProviderProps {
  children: ReactNode
}

/**
 * Listens for new notifications while the app is open, shows each one as a toast and shares the latest with the screens.
 * In the native app it also starts the native check for notifications, which covers the app being closed or in the background.
 */
export default function LiveNotificationProvider({ children }: LiveNotificationProviderProps) {
  const [latest, setLatest] = useState<LiveNotification | null>(null)
  const [shown, setShown] = useState<LiveNotification | null>(null)
  const { user } = useAuth()
  const userId = user?.id

  useEffect(() => {
    const connection = startNotificationConnection({
      onMessage: (message) => {
        if (message.type !== 'notification') return
        setLatest(message)
        setShown(message)
      },
    })
    return connection.stop
  }, [])

  useEffect(() => {
    if (userId !== undefined) startNotificationChecker(userId)
  }, [userId])

  const dismiss = useCallback(() => setShown(null), [])
  const value = useMemo(() => ({ latest }), [latest])

  return (
    <LiveNotificationContext.Provider value={value}>
      {shown && (
        <div className="toast-region">
          <Toast key={shown.id} message={shown.body} iconClass="icon-bell" onDismiss={dismiss} />
        </div>
      )}
      {children}
    </LiveNotificationContext.Provider>
  )
}
