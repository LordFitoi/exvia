import { getPathLength, locateOnPath, slicePath } from '@/services/routeProgress'
import type { MeasuredPath, PathLocation } from '@/services/routeProgress'
import type { Coordinates } from '@/types/geolocation'

// A stop this close ahead is the one the rider is standing on, not the next one.
const REACHED_STOP_METERS = 15

/** What the ride map draws on the route, each as a line of points (empty when there is none). */
export interface RideLines {
  /** From the route start to where the rider is on the track; empty before the rider reaches it. */
  readonly passed: readonly Coordinates[]
  /** From the rider to the route start, while the rider has not reached the track. */
  readonly approach: readonly Coordinates[]
  /** From where the rider is along the track to the next stop. */
  readonly current: readonly Coordinates[]
  /** From the next stop to the finish. */
  readonly remaining: readonly Coordinates[]
}

/**
 * The places along the path the rider chose, in order, ending at the finish. A route saved without
 * waypoints has only the finish, so its current leg is the whole way.
 */
export const findStops = (path: MeasuredPath, waypoints: readonly Coordinates[]): PathLocation[] => {
  const length = getPathLength(path)
  const stops: PathLocation[] = []
  let reached = 0
  for (const waypoint of waypoints) {
    const stop = locateOnPath(path, waypoint, { from: reached, to: length })
    if (!stop) continue
    stops.push(stop)
    reached = stop.distance
  }
  const finish = path.points[path.points.length - 1]
  const hasFinishStop = stops.some((stop) => stop.distance >= length)
  return hasFinishStop ? stops : [...stops, { distance: length, offset: 0, point: finish }]
}

/** Splits the track at `here` and at the next stop after it: ridden, the leg being ridden, left. */
export const splitTrack = (
  path: MeasuredPath,
  stops: readonly PathLocation[],
  here: PathLocation,
): Pick<RideLines, 'passed' | 'current' | 'remaining'> => {
  const next = stops.find((stop) => stop.distance - here.distance > REACHED_STOP_METERS)
  const target = next ?? stops[stops.length - 1]
  const length = getPathLength(path)
  const start = path.points[0]
  const finish = path.points[path.points.length - 1]
  const passed =
    here.distance <= 0
      ? []
      : slicePath(path, { from: 0, to: here.distance }, { fromPoint: start, toPoint: here.point })
  const current = slicePath(
    path,
    { from: here.distance, to: target.distance },
    { fromPoint: here.point, toPoint: target.point },
  )
  const remaining =
    target.distance >= length
      ? []
      : slicePath(path, { from: target.distance, to: length }, { fromPoint: target.point, toPoint: finish })
  return { passed, current, remaining }
}
