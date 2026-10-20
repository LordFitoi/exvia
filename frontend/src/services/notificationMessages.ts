import { isRecord } from '@/services/typeGuards'

/** A notification the server just created for this user, as heard on the live channel. */
export interface LiveNotification {
  readonly id: number
  readonly title: string
  /** The sentence to show, such as "ana invited you to ride Coast loop." */
  readonly body: string
}

export type NotificationMessage = { readonly type: 'ready' } | ({ readonly type: 'notification' } & LiveNotification)

/** Reads one message of the notifications channel; null for anything that is not one the client knows. */
export const parseNotificationMessage = (raw: unknown): NotificationMessage | null => {
  if (typeof raw !== 'string') return null
  let message: unknown
  try {
    message = JSON.parse(raw)
  } catch {
    return null
  }
  if (!isRecord(message)) return null
  if (message.type === 'ready') return { type: 'ready' }
  const { id, title, body } = message
  if (message.type !== 'notification') return null
  if (typeof id !== 'number' || typeof title !== 'string' || typeof body !== 'string') return null
  return { type: 'notification', id, title, body }
}
