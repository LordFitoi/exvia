import { deletePushSubscription, fetchPushPublicKey, savePushSubscription } from '@/services/pushApi'
import type { PushSubscriptionRecord } from '@/services/pushApi'

const BASE64_PADDING_BLOCK = 4

export const isPushSupported = (): boolean =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

// The browser wants the public key as bytes; the server sends it as URL-safe base64.
const decodeKey = (key: string): Uint8Array<ArrayBuffer> => {
  const padding = '='.repeat((BASE64_PADDING_BLOCK - (key.length % BASE64_PADDING_BLOCK)) % BASE64_PADDING_BLOCK)
  const binary = atob((key + padding).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

const toRecord = (subscription: PushSubscription): PushSubscriptionRecord => {
  const { endpoint, keys } = subscription.toJSON()
  if (!endpoint || !keys?.p256dh || !keys.auth) throw new Error('The browser gave an incomplete push subscription.')
  return { endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } }
}

/** The service worker, or undefined where there is none (it is registered in production builds only). */
const findRegistration = (): Promise<ServiceWorkerRegistration | undefined> => navigator.serviceWorker.getRegistration()

/**
 * Subscribes this browser (reusing its subscription if it has one) and tells the server it belongs to the
 * signed-in rider. Returns false when the server does not send push or there is no service worker.
 */
export const syncPushSubscription = async (): Promise<boolean> => {
  const registration = await findRegistration()
  const publicKey = await fetchPushPublicKey()
  if (!registration || !publicKey) return false
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeKey(publicKey) }))
  await savePushSubscription(toRecord(subscription))
  return true
}

/** Whether the service worker can take push at all: false in development, where it is not registered. */
export const hasPushRegistration = async (): Promise<boolean> => (await findRegistration()) !== undefined

/** Removes this browser's subscription from the server and from the browser, so the next rider starts clean. */
export const removePushSubscription = async (): Promise<void> => {
  if (!isPushSupported()) return
  const subscription = await (await findRegistration())?.pushManager.getSubscription()
  if (!subscription) return
  await deletePushSubscription(subscription.endpoint)
  await subscription.unsubscribe()
}
