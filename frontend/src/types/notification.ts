import type { ParticipantStatus, RiderProfile } from '@/types/routeGroup'

/** `expired`: the rider was invited again or taken out of the group without answering, so it is closed. */
export type InvitationStatus = ParticipantStatus | 'expired'

/** An invitation to ride in a group, as its invitee sees it. */
export interface RouteInvitation {
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
