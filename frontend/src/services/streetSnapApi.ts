import { isRecord } from '@/services/typeGuards'
import type { Coordinates } from '@/types/geolocation'

const DIRECTIONS_URL = 'https://api.mapbox.com/directions/v5/mapbox'
// Only roads the profile can drive on count as streets, so footpaths and parks never match.
const STREET_PROFILE = 'driving'
const MAX_SNAP_DISTANCE_METERS = 50
const HTTP_UNPROCESSABLE_ENTITY = 422

interface SnapOptions {
  readonly accessToken: string
  readonly signal: AbortSignal
}

const parseSnappedLocation = (payload: unknown): Coordinates | null => {
  if (!isRecord(payload) || !Array.isArray(payload.waypoints)) return null
  const [waypoint] = payload.waypoints
  if (!isRecord(waypoint) || !Array.isArray(waypoint.location)) return null
  const [longitude, latitude] = waypoint.location
  if (typeof longitude !== 'number' || typeof latitude !== 'number') return null
  return { longitude, latitude }
}

// A zero-length route between the same point twice makes Mapbox snap that point to the nearest
// street within the radius. Returns null when there is no street that close (HTTP 422 NoSegment).
export const snapToStreet = async (
  { longitude, latitude }: Coordinates,
  { accessToken, signal }: SnapOptions,
): Promise<Coordinates | null> => {
  const point = `${longitude},${latitude}`
  const params = new URLSearchParams({
    radiuses: `${MAX_SNAP_DISTANCE_METERS};${MAX_SNAP_DISTANCE_METERS}`,
    overview: 'false',
    access_token: accessToken,
  })
  const response = await fetch(`${DIRECTIONS_URL}/${STREET_PROFILE}/${point};${point}?${params}`, {
    signal,
  })
  if (response.status === HTTP_UNPROCESSABLE_ENTITY) return null
  if (!response.ok) throw new Error(`Street matching failed with HTTP ${response.status}`)
  return parseSnappedLocation(await response.json())
}
