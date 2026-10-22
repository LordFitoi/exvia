import { simplifyPath } from '@/services/simplifyPath'
import type { Coordinates } from '@/types/geolocation'

const DIRECTIONS_URL = 'https://www.google.com/maps/dir/'
// Not 'bicycling': Google has no cycling directions in many countries, and there it shows the points without a line.
const TRAVEL_MODE = 'driving'
/** Google Maps takes three waypoints on mobile browsers and nine elsewhere. */
export const MOBILE_MAX_WAYPOINTS = 3
export const DESKTOP_MAX_WAYPOINTS = 9
const ENDPOINT_COUNT = 2
const MAX_TOLERANCE_DEGREES = 1
const TOLERANCE_SEARCH_STEPS = 24
// Six decimals are about 10 cm, far finer than a street.
const COORDINATE_DECIMALS = 6

const formatPoint = ({ latitude, longitude }: Coordinates): string => `${latitude.toFixed(COORDINATE_DECIMALS)},${longitude.toFixed(COORDINATE_DECIMALS)}`

/**
 * The fewest corner points that still follow the path: the ends plus, at most, `maxPoints - 2` of the
 * points that stray farthest from a straight line. The tolerance is searched for the smallest one that fits.
 */
const pickKeyPoints = (path: readonly Coordinates[], maxPoints: number): Coordinates[] => {
  let low = 0
  let high = MAX_TOLERANCE_DEGREES
  for (let step = 0; step < TOLERANCE_SEARCH_STEPS; step++) {
    const middle = (low + high) / 2
    if (simplifyPath(path, middle).length > maxPoints) low = middle
    else high = middle
  }
  return simplifyPath(path, high)
}

/**
 * A Google Maps directions link that rebuilds a route there, with no API key: the start, the finish and
 * the key corners of the path in between. Google plans the streets itself, so the route follows the same
 * corners but is not guaranteed to take the same streets. The path needs at least two points.
 */
export const buildGoogleMapsUrl = (path: readonly Coordinates[], maxWaypoints: number): string => {
  const [origin, ...rest] = pickKeyPoints(path, maxWaypoints + ENDPOINT_COUNT)
  const destination = rest.pop() ?? origin
  const params = new URLSearchParams({
    api: '1',
    origin: formatPoint(origin),
    destination: formatPoint(destination),
    travelmode: TRAVEL_MODE,
  })
  if (rest.length > 0) params.set('waypoints', rest.map(formatPoint).join('|'))
  return `${DIRECTIONS_URL}?${params.toString()}`
}
