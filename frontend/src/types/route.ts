import type { Coordinates } from '@/types/geolocation'

export interface NewRoute {
  readonly name: string
  readonly description: string
  readonly points: readonly Coordinates[]
}

export interface SavedRoute {
  readonly id: number
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
