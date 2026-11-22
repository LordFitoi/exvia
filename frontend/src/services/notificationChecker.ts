import { Capacitor, registerPlugin } from '@capacitor/core'

import { loadTokens } from '@/services/tokenStorage'

/** Local plugin of the app (NotificationCheckerPlugin.java): checks the server for notifications while the page is not running. */
interface NotificationCheckerPlugin {
  start: (session: { apiBaseUrl: string; refreshToken: string; userId: number }) => Promise<void>
  stop: () => Promise<void>
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
