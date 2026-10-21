import { parseLngLat } from '@/services/coordinates'
import { isRecord } from '@/services/typeGuards'
import type { RideRoute } from '@/types/route'
import type { GroupParticipant, ParticipantStatus, RiderProfile, RouteGroup } from '@/types/routeGroup'

const MIN_ROUTE_POINTS = 2
const PARTICIPANT_STATUSES: readonly string[] = ['invited', 'accepted', 'rejected']

export const isParticipantStatus = (value: unknown): value is ParticipantStatus =>
  typeof value === 'string' && PARTICIPANT_STATUSES.includes(value)

export const isRiderProfile = (value: unknown): value is RiderProfile =>
  isRecord(value) &&
  typeof value.id === 'number' &&
  typeof value.username === 'string' &&
  (value.avatar === null || typeof value.avatar === 'string')

const isGroupParticipant = (value: unknown): value is GroupParticipant =>
  isRiderProfile(value) && 'status' in value && isParticipantStatus(value.status)

const parseRideRoute = (value: unknown): RideRoute | null => {
  if (!isRecord(value) || !Array.isArray(value.points) || value.points.length < MIN_ROUTE_POINTS) return null
  const { id, name, distance, estimated_time } = value
  if (typeof id !== 'string' || typeof name !== 'string') return null
  if (typeof distance !== 'number' || typeof estimated_time !== 'number') return null
  const points = value.points.map(parseLngLat)
  if (!points.every((point) => point !== null)) return null
  // Routes saved before waypoints were stored have none: their map shows only the start and the finish.
  const waypoints = Array.isArray(value.waypoints) ? value.waypoints.map(parseLngLat) : []
  if (!waypoints.every((waypoint) => waypoint !== null)) return null
  return { id, name, distance, estimated_time, points, waypoints }
}

/** Reads a group from the API; null when it is not shaped as expected. `route` is null in free mode. */
export const parseRouteGroup = (value: unknown): RouteGroup | null => {
  if (!isRecord(value) || typeof value.id !== 'string' || !isRiderProfile(value.author)) return null
  if (!Array.isArray(value.participants) || !value.participants.every(isGroupParticipant)) return null
  const route = value.route === null ? null : parseRideRoute(value.route)
  if (value.route !== null && route === null) return null
  return { id: value.id, route, author: value.author, participants: value.participants }
}
