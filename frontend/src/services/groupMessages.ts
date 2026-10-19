import { parseLngLat } from '@/services/coordinates'
import { isRecord } from '@/services/typeGuards'
import type { Coordinates } from '@/types/geolocation'

/** A rider's latest position, with when the server received it (milliseconds since the epoch, server clock). */
export interface RiderPosition {
  readonly userId: number
  readonly coordinates: Coordinates
  readonly recordedAt: number
}

/** A rider's latest position and when this phone learned it (milliseconds since the epoch, this phone's clock). */
export interface LivePosition {
  readonly position: RiderPosition
  readonly seenAt: number
}

export type GroupMessage =
  | {
      readonly type: 'ready'
      readonly userId: number
      /** The server's clock when it sent this, to age the saved positions without trusting the phone's. */
      readonly serverTime: number
      readonly positions: readonly RiderPosition[]
    }
  | { readonly type: 'position'; readonly position: RiderPosition }
  | { readonly type: 'error'; readonly detail: string }

const parseRiderPosition = (userId: number, value: unknown): RiderPosition | null => {
  if (!isRecord(value) || typeof value.recorded_at !== 'string') return null
  const coordinates = parseLngLat([value.lng, value.lat])
  const recordedAt = Date.parse(value.recorded_at)
  return coordinates && !Number.isNaN(recordedAt) ? { userId, coordinates, recordedAt } : null
}

const parseReady = (message: Record<string, unknown>): GroupMessage | null => {
  const serverTime = typeof message.server_time === 'string' ? Date.parse(message.server_time) : Number.NaN
  if (typeof message.user_id !== 'number' || Number.isNaN(serverTime) || !isRecord(message.positions)) return null
  const positions = Object.entries(message.positions).flatMap(([userId, value]) => {
    const position = parseRiderPosition(Number(userId), value)
    return position ? [position] : []
  })
  return { type: 'ready', userId: message.user_id, serverTime, positions }
}

/** Reads one message of the group channel; null for anything that is not one the client knows. */
export const parseGroupMessage = (raw: unknown): GroupMessage | null => {
  if (typeof raw !== 'string') return null
  let message: unknown
  try {
    message = JSON.parse(raw)
  } catch {
    return null
  }
  if (!isRecord(message)) return null
  if (message.type === 'ready') return parseReady(message)
  if (message.type === 'error' && typeof message.detail === 'string') {
    return { type: 'error', detail: message.detail }
  }
  if (message.type !== 'position' || typeof message.user_id !== 'number') return null
  const position = parseRiderPosition(message.user_id, message)
  return position ? { type: 'position', position } : null
}
