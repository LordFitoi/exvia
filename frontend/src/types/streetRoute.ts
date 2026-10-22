import type { Coordinates } from '@/types/geolocation'

/** A street route between two points, as Mapbox Directions answers it. */
export interface StreetRoute {
  /** From the first point to the last, at full detail. */
  readonly path: readonly Coordinates[]
  /** Meters along the streets. */
  readonly distance: number
  /** Seconds at the usual traffic speed of the street type. */
  readonly duration: number
}
