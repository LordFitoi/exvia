import { cacheLife } from 'next/cache'

import { parseLngLat } from '@/services/coordinates'
import { MAPBOX_ACCESS_TOKEN } from '@/services/mapboxConfig'
import { fetchStreetAddress } from '@/services/streetAddressApi'
import { isRecord, isRouteSummary } from '@/services/typeGuards'
import { parseWaypoints } from '@/services/waypoints'
import type { Coordinates } from '@/types/geolocation'
import type { Waypoint } from '@/types/route'
import type { SharedRoute } from '@/types/sharedRoute'

// Server only: the browser reaches the backend through the same-origin /api proxy, but a
// Server Component has to call the backend itself. Same variable and default as next.config.ts.
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8000'
const SHARED_ROUTE_TIMEOUT_MS = 10000
const HTTP_NOT_FOUND = 404
const MIN_ROUTE_POINTS = 2
// Bounds the lookups a route saved before addresses were stored can cost; the rest keep their coordinates.
const MAX_ADDRESS_LOOKUPS = 25
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const parsePoints = (value: unknown): Coordinates[] | null => {
  if (!Array.isArray(value) || value.length < MIN_ROUTE_POINTS) return null
  const points = value.map(parseLngLat)
  return points.every((point) => point !== null) ? points : null
}

const parseSharedRoute = (payload: unknown): SharedRoute | null => {
  if (!isRouteSummary(payload) || !isRecord(payload)) return null
  const { id, name, description, distance, estimated_time, author, created_at } = payload
  const points = parsePoints(payload.points)
  const waypoints = parseWaypoints(payload.waypoints)
  if (typeof author !== 'string' || typeof created_at !== 'string' || !points || !waypoints) return null
  return { id, name, description, distance, estimated_time, author, created_at, points, waypoints }
}

/** The waypoint with the address at its spot, or as it was when Mapbox knows none or does not answer. */
const withAddress = async (waypoint: Waypoint): Promise<Waypoint> => {
  if (waypoint.address || !MAPBOX_ACCESS_TOKEN) return waypoint
  try {
    const address = await fetchStreetAddress(waypoint.coordinates, {
      accessToken: MAPBOX_ACCESS_TOKEN,
      signal: AbortSignal.timeout(SHARED_ROUTE_TIMEOUT_MS),
    })
    return { ...waypoint, address }
  } catch (error) {
    console.error('Could not look up the address of a shared route point', error)
    return waypoint
  }
}

/** Routes saved before addresses were stored have none; they are looked up here, so the page can show them. */
const fillMissingAddresses = async (route: SharedRoute): Promise<SharedRoute> => {
  let remainingLookups = MAX_ADDRESS_LOOKUPS
  const waypoints = await Promise.all(
    route.waypoints.map((waypoint) => (!waypoint.address && remainingLookups-- > 0 ? withAddress(waypoint) : waypoint)),
  )
  return { ...route, waypoints }
}

/**
 * The route behind a share link, or null when the link is not a route's UUID or no such route
 * exists. The page and its metadata both ask for it, so it is cached for a few minutes; a failed
 * request throws and is never cached.
 */
export const fetchSharedRoute = async (id: string): Promise<SharedRoute | null> => {
  'use cache'
  cacheLife('minutes')

  if (!UUID_PATTERN.test(id)) return null
  const url = `${BACKEND_URL}/api/routes/${id}/shared/`
  const response = await fetch(url, { signal: AbortSignal.timeout(SHARED_ROUTE_TIMEOUT_MS) })
  if (response.status === HTTP_NOT_FOUND) return null
  if (!response.ok) throw new Error(`Could not load the shared route ${id}: the server answered ${response.status}`)

  const route = parseSharedRoute(await response.json())
  if (!route) throw new Error(`Could not load the shared route ${id}: the server sent an unexpected response`)
  return fillMissingAddresses(route)
}
