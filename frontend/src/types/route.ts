import type { Coordinates } from '@/types/geolocation'

export interface NewRoute {
  readonly name: string
  readonly description: string
  /** The whole street path, in travel order. */
  readonly points: readonly Coordinates[]
  /** The points the rider chose, in order; the path goes through them. */
  readonly waypoints: readonly Coordinates[]
}

/** The geometry of a route being saved, before it has a name. */
export type RouteGeometry = Pick<NewRoute, 'points' | 'waypoints'>

export interface SavedRoute {
  /** A UUID, also the public link of the route. */
  readonly id: string
  readonly name: string
  /** Kilometres, calculated by the server from the points. */
  readonly distance: number
  /** Whole seconds, calculated by the server from the distance. */
  readonly estimated_time: number
}

/** A route as the list returns it, without its path. */
export interface RouteSummary extends SavedRoute {
  readonly description: string
}

/** A route with its whole street path, in travel order. */
export interface RouteDetail extends RouteSummary {
  readonly points: readonly Coordinates[]
  /** Empty for routes saved before waypoints were stored. */
  readonly waypoints: readonly Coordinates[]
}

/**
 * A point added to a route being drawn; the id keeps list and marker identity stable.
 * `path` is the street path that leads to the point from the previous one, without the previous
 * point itself, ending at `coordinates`. For the first point it is just `[coordinates]`.
 */
export interface DraftPoint {
  readonly id: number
  readonly coordinates: Coordinates
  readonly path: readonly Coordinates[]
}

/** What a ride needs of its route: the path and the facts of the summary. A group member gets this
 * for the route of the group without owning it, so it has no description or waypoints. */
export type RideRoute = Pick<RouteDetail, 'id' | 'name' | 'distance' | 'estimated_time' | 'points'>
