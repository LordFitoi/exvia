import type { ParticipantStatus, RiderProfile } from '@/types/routeGroup'

/** An invitation to ride in a group, as its invitee sees it. */
export interface RouteInvitation {
  readonly id: number
  readonly author: RiderProfile
  /** The group to join. */
  readonly route_group: string
  /** The route of the group, or null in free mode. */
  readonly route_name: string | null
  /** The caller's own answer: `invited` while it is waiting. */
  readonly status: ParticipantStatus
  readonly created_at: string
}
