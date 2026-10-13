import { DIRECTIONS_URL, HTTP_UNPROCESSABLE_ENTITY, STREET_PROFILE } from '@/services/mapboxConfig'
import { isRecord } from '@/services/typeGuards'
import type { Coordinates } from '@/types/geolocation'

interface RouteOptions {
  readonly accessToken: string
  readonly signal: AbortSignal
}

const parseCoordinate = (value: unknown): Coordinates | null => {
  if (!Array.isArray(value)) return null
  const [longitude, latitude] = value
  if (typeof longitude !== 'number' || typeof latitude !== 'number') return null
  return { longitude, latitude }
}

const parseStreetPath = (payload: unknown): Coordinates[] | null => {
  if (!isRecord(payload) || !Array.isArray(payload.routes)) return null
  const [route] = payload.routes
  if (!isRecord(route) || !isRecord(route.geometry)) return null
  const { coordinates } = route.geometry
  if (!Array.isArray(coordinates)) return null
  const path = coordinates.map(parseCoordinate)
  return path.every((point) => point !== null) ? path : null
}

/**
 * The street path between two points, from `from` to `to` inclusive, at full detail so the line
 * follows every bend. Returns null when Mapbox finds no street route between them (a 200 with
 * `code: "NoRoute"` and no routes, or a 422 for a point it cannot place on a street).
 */
export const fetchStreetPath = async (
  from: Coordinates,
  to: Coordinates,
  { accessToken, signal }: RouteOptions,
): Promise<Coordinates[] | null> => {
  const waypoints = [from, to].map(({ longitude, latitude }) => `${longitude},${latitude}`).join(';')
  const params = new URLSearchParams({
    geometries: 'geojson',
    overview: 'full',
    access_token: accessToken,
  })
  const response = await fetch(`${DIRECTIONS_URL}/${STREET_PROFILE}/${waypoints}?${params}`, { signal })
  if (response.status === HTTP_UNPROCESSABLE_ENTITY) return null
  if (!response.ok) throw new Error(`Street routing failed with HTTP ${response.status}`)
  return parseStreetPath(await response.json())
}
