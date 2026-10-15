/** A finished ride, as sent to the server. Times are milliseconds since the epoch, speeds km/h. */
export interface NewRideSummary {
  readonly startedAt: number
  readonly endedAt: number
  /** False when the rider quit before the finish. */
  readonly isFinished: boolean
  readonly maxSpeed: number | null
  readonly minSpeed: number | null
  readonly avgSpeed: number | null
}

/** A ride as the history list returns it; the times are ISO 8601 strings. */
export interface RideSummaryListItem {
  readonly id: number
  readonly route: number
  readonly route_name: string
  /** Kilometres, the route's own length. */
  readonly distance: number
  readonly start_at: string
  readonly end_at: string
  /** Whole seconds from start to end. */
  readonly duration: number
  /** False when the rider quit before the finish; the route's distance then says nothing about the ride. */
  readonly is_finished: boolean
  /** Mean GPS speed while moving, km/h; null when the device gave no speed. */
  readonly avg_speed: number | null
  readonly created_at: string
}

export interface Rider {
  readonly id: number
  readonly username: string
}

/** One ride with everything the detail screen shows. */
export interface RideSummaryDetail extends RideSummaryListItem {
  /** Whole seconds, the route's estimate. */
  readonly estimated_time: number
  readonly max_speed: number | null
  readonly min_speed: number | null
  readonly participants: readonly Rider[]
}
