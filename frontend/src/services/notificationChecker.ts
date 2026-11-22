import { Capacitor, registerPlugin } from '@capacitor/core'
import type { PluginListenerHandle } from '@capacitor/core'

import { loadTokens } from '@/services/tokenStorage'

/** Local plugin of the app (NotificationCheckerPlugin.java): checks the server for notifications while the page is not running. */
interface NotificationCheckerPlugin {
  start: (session: { apiBaseUrl: string; refreshToken: string; userId: number }) => Promise<void>
  stop: () => Promise<void>
  /** Whether a tap on a notification started the app, and the page has not been told yet. */
  takePendingTap: () => Promise<{ isPending: boolean }>
  addListener: (eventName: 'notificationTapped', listener: () => void) => Promise<PluginListenerHandle>
}
const NotificationChecker = registerPlugin<NotificationCheckerPlugin>('NotificationChecker')

/**
 * Starts the native check for notifications of the signed-in user: a foreground service while the app is alive
 * and a periodic worker for when it is closed. The native side cannot read this page's localStorage, so it is
 * handed the refresh token to keep its own session. Only does something in the native app.
 */
export const startNotificationChecker = async (userId: number): Promise<void> => {
  if (!Capacitor.isNativePlatform()) return
  const tokens = loadTokens()
  if (!tokens) return
  try {
    await NotificationChecker.start({ apiBaseUrl: window.location.origin, refreshToken: tokens.refresh, userId })
  } catch (error) {
    console.error('Could not start the native check for notifications', error)
  }
}

/** Stops the native check and makes it forget the session, for the user who is signing out. */
export const stopNotificationChecker = async (): Promise<void> => {
  if (!Capacitor.isNativePlatform()) return
  try {
    await NotificationChecker.stop()
  } catch (error) {
    console.error('Could not stop the native check for notifications', error)
  }
}

/**
 * Calls `onTap` when the rider taps a notification of the native check: at once if the app was open or in the
 * background, and on start if the tap is what launched the app. Returns the function that stops listening.
 */
export const listenForNotificationTap = (onTap: () => void): (() => void) => {
  if (!Capacitor.isNativePlatform()) return () => {}
  const listener = NotificationChecker.addListener('notificationTapped', onTap)
  NotificationChecker.takePendingTap()
    .then(({ isPending }) => {
      if (isPending) onTap()
    })
    .catch((error: unknown) => console.error('Could not read the notification tap', error))
  return () => {
    listener.then((handle) => handle.remove()).catch((error: unknown) => console.error('Could not stop listening', error))
  }
}
