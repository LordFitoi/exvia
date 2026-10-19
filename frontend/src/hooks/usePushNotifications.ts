'use client'

import { useCallback, useEffect, useState } from 'react'

import { hasPushRegistration, isPushSupported, syncPushSubscription } from '@/services/webPush'

/** Push is switched off until the server side is configured properly; set to true to bring it back. */
const IS_PUSH_ENABLED = false

/** `off` can be turned on from the app; `blocked` only from the browser's settings. */
export type PushStatus = 'checking' | 'unsupported' | 'blocked' | 'off' | 'on'

interface PushNotifications {
  readonly status: PushStatus
  readonly isPending: boolean
  /** Asks permission (this must run from a tap) and subscribes. */
  enable: () => Promise<void>
}

const permissionToStatus = (permission: NotificationPermission): PushStatus => {
  if (permission === 'denied') return 'blocked'
  return permission === 'granted' ? 'on' : 'off'
}

/**
 * Web Push for the signed-in rider. When the browser already allowed notifications, the subscription is
 * registered again silently on mount, which also hands a shared phone to whoever is signed in now.
 */
export const usePushNotifications = (): PushNotifications => {
  const [status, setStatus] = useState<PushStatus>(IS_PUSH_ENABLED ? 'checking' : 'unsupported')
  const [isPending, setIsPending] = useState(false)

  const subscribe = useCallback(async () => {
    try {
      setStatus((await syncPushSubscription()) ? 'on' : 'unsupported')
    } catch (error) {
      console.error('Could not subscribe to push notifications', error)
      setStatus('off')
    }
  }, [])

  useEffect(() => {
    if (!IS_PUSH_ENABLED) return
    let isCancelled = false
    const start = async () => {
      if (!isPushSupported() || !(await hasPushRegistration())) {
        if (!isCancelled) setStatus('unsupported')
        return
      }
      if (Notification.permission === 'granted') await subscribe()
      else if (!isCancelled) setStatus(permissionToStatus(Notification.permission))
    }
    start()
    return () => {
      isCancelled = true
    }
  }, [subscribe])

  const enable = async () => {
    setIsPending(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') await subscribe()
      else setStatus(permissionToStatus(permission))
    } finally {
      setIsPending(false)
    }
  }

  return { status, isPending, enable }
}
