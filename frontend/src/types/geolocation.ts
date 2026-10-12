export interface Coordinates {
  readonly longitude: number
  readonly latitude: number
}

export type GeolocationStatus = 'pending' | 'ready' | 'denied' | 'unavailable'

export interface GeolocationState {
  readonly status: GeolocationStatus
  readonly coordinates: Coordinates | null
}
