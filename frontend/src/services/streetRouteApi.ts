import { DIRECTIONS_URL, HTTP_UNPROCESSABLE_ENTITY, STREET_PROFILE } from '@/services/mapboxConfig'
import { parseLngLat } from '@/services/coordinates'
import { isRecord } from '@/services/typeGuards'
import type { Coordinates } from '@/types/geolocation'
import type { StreetRoute } from '@/types/streetRoute'

interface RouteOptions {
  readonly accessToken: string
  readonly signal: AbortSignal
}

const parseStreetRoute = (payload: unknown): StreetRoute | null => {
  if (!isRecord(payload) || !Array.isArray(payload.routes)) return null
  const [route] = payload.routes
  if (!isRecord(route) || !isRecord(route.geometry)) return null
  const { coordinates } = route.geometry
  const { distance, duration } = route
  if (!Array.isArray(coordinates) || typeof distance !== 'number' || typeof duration !== 'number') return null
  const path = coordinates.map(parseLngLat)
  return path.every((point) => point !== null) ? { path, distance, duration } : null
}

/**
 * The street route between two points: the path from `from` to `to` inclusive, at full detail so the
 * line follows every bend, with its distance and duration. Returns null when Mapbox finds no street
 * route between them (a 200 with `code: "NoRoute"` and no routes, or a 422 for a point it cannot
 * place on a street).
 */
export const fetchStreetRoute = async (
  from: Coordinates,
  to: Coordinates,
  { accessToken, signal }: RouteOptions,
): Promise<StreetRoute | null> => {
  const waypoints = [from, to].map(({ longitude, latitude }) => `${longitude},${latitude}`).join(';')
  const params = new URLSearchParams({
    geometries: 'geojson',
    overview: 'full',
    access_token: accessToken,
  })
  const response = await fetch(`${DIRECTIONS_URL}/${STREET_PROFILE}/${waypoints}?${params}`, { signal })
  if (response.status === HTTP_UNPROCESSABLE_ENTITY) return null
  if (!response.ok) throw new Error(`Street routing failed with HTTP ${response.status}`)
  return parseStreetRoute(await response.json())
}

/** Just the path of `fetchStreetRoute`, for callers that need no distance or duration. */
export const fetchStreetPath = async (
  from: Coordinates,
  to: Coordinates,
  options: RouteOptions,
): Promise<Coordinates[] | null> => {
  const route = await fetchStreetRoute(from, to, options)
  return route && [...route.path]
}
