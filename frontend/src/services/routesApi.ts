import { ApiError } from '@/services/apiClient'
import { requestJsonAuthorized } from '@/services/authorizedRequest'
import { parseLngLat } from '@/services/coordinates'
import { isRecord, isRouteSummary, isSavedRoute } from '@/services/typeGuards'
import { parseWaypoints, toApiWaypoint } from '@/services/waypoints'
import type { Coordinates } from '@/types/geolocation'
import type { NewRoute, RouteDetail, RouteSummary, SavedRoute } from '@/types/route'

const ROUTES_PATH = '/api/routes/'
const MIN_ROUTE_POINTS = 2
const UNEXPECTED_RESPONSE_MESSAGE = 'The server sent an unexpected response. Please try again.'

const unexpectedResponse = (): ApiError => new ApiError(502, UNEXPECTED_RESPONSE_MESSAGE)

const parseCoordinateList = (value: unknown, minimum: number): Coordinates[] | null => {
  if (!Array.isArray(value) || value.length < minimum) return null
  const coordinates = value.map(parseLngLat)
  return coordinates.every((coordinate) => coordinate !== null) ? coordinates : null
}

const toLngLatPairs = (coordinates: readonly Coordinates[]): number[][] =>
  coordinates.map(({ longitude, latitude }) => [longitude, latitude])

const toRouteBody = ({ name, description, points, waypoints }: NewRoute) => ({
  name,
  description,
  points: toLngLatPairs(points),
  waypoints: waypoints.map(toApiWaypoint),
})

const expectSavedRoute = (payload: unknown): SavedRoute => {
  if (!isSavedRoute(payload)) throw unexpectedResponse()
  return payload
}

/** Saves a route. The server expects each point as a [longitude, latitude] pair. */
export const createRoute = async (route: NewRoute): Promise<SavedRoute> =>
  expectSavedRoute(
    await requestJsonAuthorized(ROUTES_PATH, { method: 'POST', body: toRouteBody(route) }),
  )

/** Replaces the name, description and geometry of one of the caller's routes. */
export const updateRoute = async (id: string, route: NewRoute): Promise<SavedRoute> =>
  expectSavedRoute(
    await requestJsonAuthorized(`${ROUTES_PATH}${id}/`, { method: 'PUT', body: toRouteBody(route) }),
  )

export const deleteRoute = async (id: string): Promise<void> => {
  await requestJsonAuthorized(`${ROUTES_PATH}${id}/`, { method: 'DELETE' })
}

/** The caller's routes, newest first, without their paths. */
export const fetchRoutes = async (): Promise<RouteSummary[]> => {
  const routes = await requestJsonAuthorized(ROUTES_PATH)
  if (!Array.isArray(routes) || !routes.every(isRouteSummary)) throw unexpectedResponse()
  return routes
}

/** One route with its whole street path. */
export const fetchRoute = async (id: string): Promise<RouteDetail> => {
  const route = await requestJsonAuthorized(`${ROUTES_PATH}${id}/`)
  const points = isRecord(route) ? parseCoordinateList(route.points, MIN_ROUTE_POINTS) : null
  const waypoints = isRecord(route) ? parseWaypoints(route.waypoints) : null
  if (!isRouteSummary(route) || !points || !waypoints) throw unexpectedResponse()
  return { ...route, points, waypoints }
}
