import { ApiError } from '@/services/apiClient'
import { requestJsonAuthorized } from '@/services/authorizedRequest'
import { parseLngLat } from '@/services/coordinates'
import { isRecord, isRouteSummary, isSavedRoute } from '@/services/typeGuards'
import type { Coordinates } from '@/types/geolocation'
import type { NewRoute, RouteDetail, RouteSummary, SavedRoute } from '@/types/route'

const ROUTES_PATH = '/api/routes/'
const MIN_ROUTE_POINTS = 2
const UNEXPECTED_RESPONSE_MESSAGE = 'The server sent an unexpected response. Please try again.'

const unexpectedResponse = (): ApiError => new ApiError(502, UNEXPECTED_RESPONSE_MESSAGE)

const parsePoints = (value: unknown): Coordinates[] | null => {
  if (!Array.isArray(value) || value.length < MIN_ROUTE_POINTS) return null
  const points = value.map(parseLngLat)
  return points.every((point) => point !== null) ? points : null
}

/** Saves a route. The server expects each point as a [longitude, latitude] pair. */
export const createRoute = async ({ name, description, points }: NewRoute): Promise<SavedRoute> => {
  const body = {
    name,
    description,
    points: points.map(({ longitude, latitude }) => [longitude, latitude]),
  }
  const saved = await requestJsonAuthorized(ROUTES_PATH, { method: 'POST', body })
  if (!isSavedRoute(saved)) throw unexpectedResponse()
  return saved
}

/** The caller's routes, newest first, without their paths. */
export const fetchRoutes = async (): Promise<RouteSummary[]> => {
  const routes = await requestJsonAuthorized(ROUTES_PATH)
  if (!Array.isArray(routes) || !routes.every(isRouteSummary)) throw unexpectedResponse()
  return routes
}

/** One route with its whole street path. */
export const fetchRoute = async (id: number): Promise<RouteDetail> => {
  const route = await requestJsonAuthorized(`${ROUTES_PATH}${id}/`)
  const points = isRecord(route) ? parsePoints(route.points) : null
  if (!isRouteSummary(route) || !points) throw unexpectedResponse()
  return { ...route, points }
}
