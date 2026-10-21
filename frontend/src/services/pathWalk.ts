import { calculateBearing } from '@/services/bearing'
import type { MeasuredPath } from '@/services/routeProgress'
import type { Coordinates } from '@/types/geolocation'

const HALF_TURN_DEGREES = 180
const FULL_TURN_DEGREES = 360
const QUARTER_TURN_DEGREES = 90

/** The angle between two compass bearings, 0 to 180, whichever way round is shorter. */
export const getTurnAngle = (from: number, to: number): number => {
  const difference = Math.abs(from - to) % FULL_TURN_DEGREES
  return difference > HALF_TURN_DEGREES ? FULL_TURN_DEGREES - difference : difference
}

/** The bearing of the path (at least two points) when it is followed forward, at `distance` from its start. */
export const getPathBearing = (path: MeasuredPath, distance: number): number => {
  const segment = Math.max(0, path.distances.findIndex((end) => end >= distance) - 1)
  return calculateBearing(path.points[segment], path.points[segment + 1])
}

/** Whether a rider heading `heading` goes toward the end of the path rather than its start; forward when the heading is unknown. */
export const isHeadingForward = (path: MeasuredPath, distance: number, heading: number | null): boolean =>
  heading === null || getTurnAngle(getPathBearing(path, distance), heading) <= QUARTER_TURN_DEGREES

/**
 * The vertices met going from `distance` along the path, toward its end or its start, until `reach` meters
 * are covered: the last one lies beyond `reach` so the stretch is covered in full.
 */
export const walkPath = (
  path: MeasuredPath,
  distance: number,
  isForward: boolean,
  reach: number,
): Coordinates[] => {
  const indexes = path.points.map((_, index) => index)
  const ahead = isForward
    ? indexes.filter((index) => path.distances[index] > distance)
    : indexes.filter((index) => path.distances[index] < distance).reverse()
  const beyondReach = ahead.findIndex((index) => Math.abs(path.distances[index] - distance) > reach)
  const covered = beyondReach === -1 ? ahead : ahead.slice(0, beyondReach + 1)
  return covered.map((index) => path.points[index])
}
