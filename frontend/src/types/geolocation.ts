export interface Coordinates {
  readonly longitude: number
  readonly latitude: number
}

export type GeolocationStatus = 'pending' | 'ready' | 'denied' | 'unavailable'

export type StreetPositionStatus = 'snapping' | 'ready' | 'off-street' | 'failed'

export interface StreetPositionState {
  readonly status: StreetPositionStatus
  readonly coordinates: Coordinates | null
}

export interface GeolocationState {
  readonly status: GeolocationStatus
  readonly coordinates: Coordinates | null
  /** When the position was taken, in milliseconds since the epoch; null while it is unknown. */
  readonly timestamp: number | null
  /** Meters per second, or null when the device cannot tell (it often can't while standing). */
  readonly speed: number | null
  /** The radius, in meters, within which the position is expected to be; null while it is unknown. */
  readonly accuracy: number | null
}
