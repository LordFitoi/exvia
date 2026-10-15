import { cacheLife } from 'next/cache'

import { parseLngLat } from '@/services/coordinates'
import { isRecord, isRouteSummary } from '@/services/typeGuards'
import type { Coordinates } from '@/types/geolocation'
import type { SharedRoute } from '@/types/sharedRoute'

// Server only: the browser reaches the backend through the same-origin /api proxy, but a
// Server Component has to call the backend itself. Same variable and default as next.config.ts.
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8000'
const SHARED_ROUTE_TIMEOUT_MS = 10000
const HTTP_NOT_FOUND = 404
const MIN_ROUTE_POINTS = 2
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
  if (typeof author !== 'string' || typeof created_at !== 'string' || !points) return null
  return { id, name, description, distance, estimated_time, author, created_at, points }
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
  return route
}
