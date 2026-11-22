'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import Toast from '@/components/feedback/Toast'
import { LiveNotificationContext } from '@/context/LiveNotificationContext'
import { useAuth } from '@/hooks/useAuth'
import { startNotificationConnection } from '@/services/notificationConnection'
import type { LiveNotification } from '@/services/notificationMessages'
import { listenForNotificationTap, startNotificationChecker } from '@/services/notificationChecker'

const HOME_PATH = '/'

interface LiveNotificationProviderProps {
  children: ReactNode
}

/**
 * Listens for new notifications while the app is open, shows each one as a toast and shares the latest with the screens.
 * In the native app it also starts the native check for notifications, which covers the app being closed or in the background,
 * and sends the rider Home with the list requested when they tap one of its notifications.
 */
export default function LiveNotificationProvider({ children }: LiveNotificationProviderProps) {
  const [latest, setLatest] = useState<LiveNotification | null>(null)
  const [shown, setShown] = useState<LiveNotification | null>(null)
  const [isListRequested, setIsListRequested] = useState(false)
  const router = useRouter()
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

  useEffect(
    () =>
      listenForNotificationTap(() => {
        setIsListRequested(true)
        router.push(HOME_PATH)
      }),
    [router],
  )

  const dismiss = useCallback(() => setShown(null), [])
  const clearListRequest = useCallback(() => setIsListRequested(false), [])
  const value = useMemo(
    () => ({ latest, isListRequested, clearListRequest }),
    [latest, isListRequested, clearListRequest],
  )

  return (
    <LiveNotificationContext.Provider value={value}>
      {shown && (
        <div className="toast-region">
          <Toast key={shown.id} message={`${shown.title}: ${shown.body}`} iconClass="icon-bell" onDismiss={dismiss} />
        </div>
      )}
      {children}
    </LiveNotificationContext.Provider>
  )
}
