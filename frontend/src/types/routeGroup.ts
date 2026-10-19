import type { RideRoute } from '@/types/route'

export type ParticipantStatus = 'invited' | 'accepted' | 'rejected'

/** Who a rider is: enough to show a name and a picture, or initials when there is none. */
export interface RiderProfile {
  readonly id: number
  readonly username: string
  /** A site-relative URL of the profile picture, or null. */
  readonly avatar: string | null
}

export interface GroupParticipant extends RiderProfile {
  readonly status: ParticipantStatus
}

/** Riders rolling together under their author, on a route or in free mode. */
export interface RouteGroup {
  /** A UUID, also the name of the live channel. */
  readonly id: string
  /** The route to ride, or null in free mode. */
  readonly route: RideRoute | null
  readonly author: RiderProfile
  readonly participants: readonly GroupParticipant[]
}

export interface NewRouteGroup {
  /** The id of one of the caller's routes, or null for free mode. */
  readonly routeId: string | null
  /** The usernames to invite; may be empty. */
  readonly invitees: readonly string[]
}
