import { parseLngLat } from '@/services/coordinates'
import { isRecord } from '@/services/typeGuards'
import type { Coordinates } from '@/types/geolocation'

/** A rider's latest position, with when the server received it (milliseconds since the epoch, server clock). */
export interface RiderPosition {
  readonly userId: number
  readonly coordinates: Coordinates
  readonly recordedAt: number
  /** How fast the rider was going, in km/h; null when their device gave none. */
  readonly speed: number | null
}

/**
 * A rider's latest position and when the server received it, on this phone's clock (milliseconds since the
 * epoch): the server's stamp moved by how far this phone's clock is from the server's. Positions come in batches,
 * so it is not when this phone heard them, and it is what tells how old a position is.
 */
export interface LivePosition {
  readonly position: RiderPosition
  readonly seenAt: number
}

export type PresenceStatus = 'joined' | 'left'

/** Positions with the server's clock when it sent them, to age them without trusting the phone's. */
export interface PositionBatch {
  readonly serverTime: number
  readonly positions: readonly RiderPosition[]
}

export type GroupMessage =
  | ({ readonly type: 'ready'; readonly userId: number } & PositionBatch)
  /** The positions of the other riders that changed since the last one, in a single message. */
  | ({ readonly type: 'positions' } & PositionBatch)
  | { readonly type: 'presence'; readonly userId: number; readonly status: PresenceStatus }
  /** The leader changed the route (or went to free mode); the group has to be read again for the new one. */
  | { readonly type: 'route_changed' }
  /** The leader handed the group to this rider; the group has to be read again to know who leads. */
  | { readonly type: 'leader_changed'; readonly userId: number }
  | { readonly type: 'error'; readonly detail: string }

const parseRiderPosition = (userId: number, value: unknown): RiderPosition | null => {
  if (!isRecord(value) || typeof value.recorded_at !== 'string') return null
  const coordinates = parseLngLat([value.lng, value.lat])
  const recordedAt = Date.parse(value.recorded_at)
  const speed = typeof value.speed === 'number' ? value.speed : null
  return coordinates && !Number.isNaN(recordedAt) ? { userId, coordinates, recordedAt, speed } : null
}

const parsePositionBatch = (message: Record<string, unknown>): PositionBatch | null => {
  const serverTime = typeof message.server_time === 'string' ? Date.parse(message.server_time) : Number.NaN
  if (Number.isNaN(serverTime) || !isRecord(message.positions)) return null
  const positions = Object.entries(message.positions).flatMap(([userId, value]) => {
    const position = parseRiderPosition(Number(userId), value)
    return position ? [position] : []
  })
  return { serverTime, positions }
}

const parseReady = (message: Record<string, unknown>): GroupMessage | null => {
  const batch = parsePositionBatch(message)
  if (typeof message.user_id !== 'number' || !batch) return null
  return { type: 'ready', userId: message.user_id, ...batch }
}

const parsePositions = (message: Record<string, unknown>): GroupMessage | null => {
  const batch = parsePositionBatch(message)
  return batch ? { type: 'positions', ...batch } : null
}

const parsePresence = (message: Record<string, unknown>): GroupMessage | null => {
  const { user_id: userId, status } = message
  if (typeof userId !== 'number' || (status !== 'joined' && status !== 'left')) return null
  return { type: 'presence', userId, status }
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
  if (message.type === 'positions') return parsePositions(message)
  if (message.type === 'error' && typeof message.detail === 'string') {
    return { type: 'error', detail: message.detail }
  }
  if (message.type === 'presence') return parsePresence(message)
  if (message.type === 'route_changed') return { type: 'route_changed' }
  if (message.type === 'leader_changed' && typeof message.user_id === 'number') {
    return { type: 'leader_changed', userId: message.user_id }
  }
  return null
}
