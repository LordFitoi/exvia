import { ApiError } from '@/services/apiClient'
import { requestJsonAuthorized } from '@/services/authorizedRequest'
import { isRecord } from '@/services/typeGuards'

const KEY_PATH = '/api/notifications/push/key/'
const SUBSCRIPTIONS_PATH = '/api/notifications/push/subscriptions/'
const UNEXPECTED_RESPONSE_MESSAGE = 'The server sent an unexpected response. Please try again.'

/** What the server stores of a browser's subscription: where to push and the keys that encrypt it. */
export interface PushSubscriptionRecord {
  readonly endpoint: string
  readonly keys: { readonly p256dh: string; readonly auth: string }
}

/** The key a browser subscribes with, or null when the server does not send push. */
export const fetchPushPublicKey = async (): Promise<string | null> => {
  const payload = await requestJsonAuthorized(KEY_PATH)
  if (!isRecord(payload) || (payload.public_key !== null && typeof payload.public_key !== 'string')) {
    throw new ApiError(502, UNEXPECTED_RESPONSE_MESSAGE)
  }
  return payload.public_key
}

/** Registers this browser to receive the caller's notifications; a browser already known moves to the caller. */
export const savePushSubscription = async (subscription: PushSubscriptionRecord): Promise<void> => {
  await requestJsonAuthorized(SUBSCRIPTIONS_PATH, { method: 'POST', body: subscription })
}

/** Stops sending the caller's notifications to the browser with this endpoint. */
export const deletePushSubscription = async (endpoint: string): Promise<void> => {
  await requestJsonAuthorized(SUBSCRIPTIONS_PATH, { method: 'DELETE', body: { endpoint } })
}
