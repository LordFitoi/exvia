import type { PlaceLocationCategory } from '@/services/placeLocationCategories'
import type { Coordinates } from '@/types/geolocation'

/** A point the rider chose for a route: where it is and what is there. */
export interface Waypoint {
  readonly coordinates: Coordinates
  /** The name of the saved place there or else the address; empty when it is not known. */
  readonly name: string
  /** The nearest address; empty when it is not known. */
  readonly address: string
  /** The kind of the rider's saved place there; null for a plain point. */
  readonly category: PlaceLocationCategory | null
}

/** What a saved place or a place found by the search adds to its point: its name and kind. The address is looked up for every point. */
export type PointDetails = Pick<Waypoint, 'name' | 'category'>

export interface NewRoute {
  readonly name: string
  readonly description: string
  /** The whole street path, in travel order. */
  readonly points: readonly Coordinates[]
  /** The points the rider chose, in order; the path goes through them. */
  readonly waypoints: readonly Waypoint[]
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
  readonly waypoints: readonly Waypoint[]
}

/**
 * A point added to a route being drawn; the id keeps list and marker identity stable.
 * `path` is the street path that leads to the point from the previous one, without the previous
 * point itself, ending at `coordinates`. For the first point it is just `[coordinates]`.
 */
export interface DraftPoint extends Waypoint {
  readonly id: number
  readonly path: readonly Coordinates[]
}

/** What a ride needs of its route: the path, the checkpoints and the facts of the summary. A group member
 * gets this for the route of the group without owning it, so it has no description. */
export type RideRoute = Pick<RouteDetail, 'id' | 'name' | 'distance' | 'estimated_time' | 'points' | 'waypoints'>

/** How far the rider has got on the leg they are on, from the last stop (the start or a checkpoint) they reached. */
export interface CurrentLeg {
  /** The kilometres from that stop to where the rider is. */
  readonly kilometres: number
  /** When the rider was there, in milliseconds since the epoch. */
  readonly at: number
}
