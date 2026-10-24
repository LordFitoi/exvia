import type { ParticipantStatus, RiderProfile } from '@/types/routeGroup'

/** `expired`: the rider was invited again or taken out of the group without answering, so it is closed. */
export type InvitationStatus = ParticipantStatus | 'expired'

/** An invitation to ride in a group, as its invitee sees it. */
export interface RouteInvitation {
  readonly event_type: 'route_invitation'
  readonly id: number
  readonly author: RiderProfile
  /** The group to join. */
  readonly route_group: string
  /** The route of the group, or null in free mode. */
  readonly route_name: string | null
  /** The caller's own answer to this invitation: `invited` while it is waiting. */
  readonly status: InvitationStatus
  readonly created_at: string
}

/** `open`: the caller can join; `joined`: they ride in it; `ended`: nobody can join any more. */
export type StartedRideStatus = 'open' | 'joined' | 'ended'

/** A clan ride that started: its group, led by the clan admin, is open to the members. */
export interface StartedRide {
  readonly event_type: 'event_started'
  readonly id: number
  /** The clan admin who leads the ride. */
  readonly author: RiderProfile
  /** The group to join. */
  readonly route_group: string
  /** The scheduled event that started. */
  readonly scheduled_event: number
  readonly event_title: string
  readonly clan_name: string
  readonly status: StartedRideStatus
  readonly created_at: string
}

/** The notifications about riding together, newest first. */
export type RideNotification = RouteInvitation | StartedRide
