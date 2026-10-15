import { getPathLength, slicePath } from '@/services/routeProgress'
import type { MeasuredPath, PathLocation } from '@/services/routeProgress'
import type { Coordinates } from '@/types/geolocation'

/** What the ride map draws on the route, each as a line of points (empty when there is none). */
export interface RideLines {
  /** From the route start to where the rider is on the track; empty before the rider reaches it. */
  readonly passed: readonly Coordinates[]
  /** From the rider to the route start, while the rider has not reached the track. */
  readonly approach: readonly Coordinates[]
  /** From where the rider is along the track to the finish. */
  readonly remaining: readonly Coordinates[]
}

/** Splits the track at `here`: what was ridden, and what is left to the finish. */
export const splitTrack = (path: MeasuredPath, here: PathLocation): Pick<RideLines, 'passed' | 'remaining'> => {
  const start = path.points[0]
  const finish = path.points[path.points.length - 1]
  const passed =
    here.distance <= 0
      ? []
      : slicePath(path, { from: 0, to: here.distance }, { fromPoint: start, toPoint: here.point })
  const remaining = slicePath(
    path,
    { from: here.distance, to: getPathLength(path) },
    { fromPoint: here.point, toPoint: finish },
  )
  return { passed, remaining }
}
