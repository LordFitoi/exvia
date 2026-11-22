import type { Coordinates } from '@/types/geolocation'
import type { Waypoint } from '@/types/route'

/** A place on the path the rider has ridden, and the moment (milliseconds since the epoch) they were there. */
export interface TrackPoint {
  readonly coordinates: Coordinates
  readonly at: number
}

/** A recorded track turned into a route: the street path and the fewest waypoints that lead along it. */
export interface TrackRoute {
  readonly points: readonly Coordinates[]
  readonly waypoints: readonly Waypoint[]
  /** When the rider was at each waypoint, in milliseconds since the epoch. */
  readonly reachedAt: readonly number[]
}
