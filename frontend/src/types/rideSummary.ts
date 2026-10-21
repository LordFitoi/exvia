/** A finished ride, as sent to the server. Times are milliseconds since the epoch, speeds km/h. */
export interface NewRideSummary {
  /** The group the ride was taken in: the riders connected to it when it is saved become its participants. */
  readonly groupId: string
  readonly startedAt: number
  readonly endedAt: number
  /** False when the rider quit before the finish. */
  readonly isFinished: boolean
  readonly maxSpeed: number | null
  /** When the rider reached the start and then each checkpoint, in route order; shorter when the rider did not get to the last ones. */
  readonly reachedAt: readonly number[]
}

/** A ride as the history list returns it; the times are ISO 8601 strings. */
export interface RideSummaryListItem {
  readonly id: number
  readonly route: string
  readonly route_name: string
  /** Kilometres, the route's own length. */
  readonly distance: number
  readonly start_at: string
  readonly end_at: string
  /** Whole seconds from start to end. */
  readonly duration: number
  /** False when the rider quit before the finish; the route's distance then says nothing about the ride. */
  readonly is_finished: boolean
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
  /** The id of the rider who saved the ride, the only one who can delete it. */
  readonly author: number
  /** The fastest GPS reading, km/h; null when the device gave no speed. */
  readonly max_speed: number | null
  /** When the rider reached the start and then each checkpoint, in route order, as ISO 8601 strings; shorter when the rider did not get to the last ones. */
  readonly reached_at: readonly string[]
  readonly participants: readonly Rider[]
}
