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
}
