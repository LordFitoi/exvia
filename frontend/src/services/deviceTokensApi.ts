import { requestJsonAuthorized } from '@/services/authorizedRequest'

const DEVICES_PATH = '/api/notifications/devices/'

/** Tells the server which phone to push this user's notifications to. Safe to repeat: the server keeps one row per token. */
export const registerDeviceToken = async (token: string): Promise<void> => {
  await requestJsonAuthorized(DEVICES_PATH, { method: 'POST', body: { token } })
}

/** Stops pushing to this phone, so the next person to sign in on it does not get this user's notifications. */
export const unregisterDeviceToken = async (token: string): Promise<void> => {
  await requestJsonAuthorized(DEVICES_PATH, { method: 'DELETE', body: { token } })
}
