import { Capacitor } from '@capacitor/core'
import type { PluginListenerHandle } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'

import { registerDeviceToken, unregisterDeviceToken } from '@/services/deviceTokensApi'

// Same id as ANDROID_CHANNEL_ID in apps/notifications/push.py and the default channel in AndroidManifest.xml.
const CHANNEL_ID = 'exvia-notifications'
const CHANNEL_NAME = 'Invitations and rides'
// Android's IMPORTANCE_HIGH: the notification pops up on screen and makes a sound.
const HIGH_IMPORTANCE = 4
const PERMISSION_GRANTED = 'granted'

let currentToken: string | null = null

const saveToken = async (token: string) => {
  currentToken = token
  try {
    await registerDeviceToken(token)
  } catch (error) {
    console.error('Could not register this phone for push notifications', error)
  }
}

const requestPermission = async (): Promise<boolean> => {
  const { receive } = await PushNotifications.requestPermissions()
  return receive === PERMISSION_GRANTED
}

/**
 * Registers this phone with Firebase and gives its token to the server, so notifications reach the rider with
 * the app closed or in the background (the open app hears them live and shows a toast instead). Only does
 * something in the native app. Returns the function that stops listening.
 */
export const startPushNotifications = (): (() => void) => {
  if (!Capacitor.isNativePlatform()) return () => undefined
  let isStopped = false
  let listeners: PluginListenerHandle[] = []

  const start = async () => {
    try {
      const added = await Promise.all([
        PushNotifications.addListener('registration', ({ value }) => saveToken(value)),
        PushNotifications.addListener('registrationError', (error) =>
          console.error('Firebase could not register this phone', error),
        ),
      ])
      if (isStopped) return added.forEach((listener) => listener.remove())
      listeners = added
      if (!(await requestPermission())) return
      await PushNotifications.createChannel({ id: CHANNEL_ID, name: CHANNEL_NAME, importance: HIGH_IMPORTANCE })
      await PushNotifications.register()
    } catch (error) {
      console.error('Could not set up push notifications', error)
    }
  }

  start()
  return () => {
    isStopped = true
    listeners.forEach((listener) => listener.remove())
  }
}

/**
 * Stops pushes to this phone for the user who is signing out: the server forgets its token and Firebase drops
 * it, so a failed request still leaves a dead token. Call it before the session is cleared, since forgetting
 * the token is an authorized request.
 */
export const forgetPushDevice = async (): Promise<void> => {
  if (!Capacitor.isNativePlatform()) return
  const token = currentToken
  currentToken = null
  try {
    if (token) await unregisterDeviceToken(token)
    await PushNotifications.unregister()
  } catch (error) {
    console.error('Could not stop push notifications for this phone', error)
  }
}
