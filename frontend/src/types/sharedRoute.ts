import type { Coordinates } from '@/types/geolocation'
import type { Waypoint } from '@/types/route'

/** A route as anyone with its link sees it: the whole path, its numbers and who drew it. */
export interface SharedRoute {
  /** The UUID that is also in the link. */
  readonly id: string
  readonly name: string
  readonly description: string
  /** Kilometres. */
  readonly distance: number
  /** Whole seconds. */
  readonly estimated_time: number
  /** The username of the rider who drew it. */
  readonly author: string
  /** ISO 8601 datetime. */
  readonly created_at: string
  /** The whole street path, in travel order. */
  readonly points: readonly Coordinates[]
  /** The points the rider chose, start and finish included; empty for a route saved before they were stored. */
  readonly waypoints: readonly Waypoint[]
}
