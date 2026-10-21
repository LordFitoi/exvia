import type { Map as MapboxMap } from 'mapbox-gl'

import { followStreets, readStreetLines } from '@/services/streetLines'
import { isHeadingForward, walkPath } from '@/services/pathWalk'
import { getPathLength, locateOnPath, METERS_PER_DEGREE_LATITUDE } from '@/services/routeProgress'
import type { MeasuredPath } from '@/services/routeProgress'
import type { Coordinates } from '@/types/geolocation'

// A rider this close to the route is on it, and takes the route's own turns.
const ON_ROUTE_METERS = 25

interface PathAheadRequest {
  readonly position: Coordinates
  /** The compass bearing the rider is moving in, or null while it is unknown. */
  readonly heading: number | null
  /** How many meters of path are wanted. */
  readonly reach: number
  /** The route of the ride; null in free mode. */
  readonly route: MeasuredPath | null
  /** The map, whose street lines are used off the route; null while it is not there. */
  readonly map: MapboxMap | null
}

const followRoute = (
  route: MeasuredPath,
  position: Coordinates,
  { heading, reach }: { heading: number | null; reach: number },
): Coordinates[] | null => {
  const location = locateOnPath(route, position, { from: 0, to: getPathLength(route) })
  if (!location || location.offset > ON_ROUTE_METERS) return null
  const isForward = isHeadingForward(route, location.distance, heading)
  return [position, location.point, ...walkPath(route, location.distance, isForward, reach)]
}

/** A straight line along the heading, for a rider on no street that is known; just the position while the heading is unknown. */
const goStraight = (position: Coordinates, heading: number | null, reach: number): Coordinates[] => {
  if (heading === null) return [position]
  const radians = (heading * Math.PI) / 180
  const cosine = Math.cos((position.latitude * Math.PI) / 180)
  return [
    position,
    {
      latitude: position.latitude + (reach * Math.cos(radians)) / METERS_PER_DEGREE_LATITUDE,
      longitude: position.longitude + (reach * Math.sin(radians)) / (METERS_PER_DEGREE_LATITUDE * cosine),
    },
  ]
}

/**
 * The path a rider is expected to take from their reported position, so that the marker keeps to the street:
 * the route when the rider is on it (with its turns), else the streets drawn on the map around them, else a
 * straight line along their heading (a rider off screen has no streets loaded, and nobody sees them).
 */
export const findPathAhead = ({ position, heading, reach, route, map }: PathAheadRequest): Coordinates[] => {
  const onRoute = route && followRoute(route, position, { heading, reach })
  if (onRoute) return onRoute
  if (!map || heading === null) return goStraight(position, heading, reach)
  const onStreet = followStreets(readStreetLines(map, position, reach), position, { heading, reach })
  return onStreet ?? goStraight(position, heading, reach)
}
