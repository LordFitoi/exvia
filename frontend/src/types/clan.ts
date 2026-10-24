import type { SavedRoute } from '@/types/route'

export interface ClanMember {
  readonly id: number
  readonly username: string
}

export interface Clan {
  readonly id: number
  readonly name: string
  readonly description: string
  /** User id of the owner. */
  readonly owner: number
  readonly created_at: string
}

export interface ClanDetail extends Clan {
  readonly members: readonly ClanMember[]
}

export interface NewClan {
  readonly name: string
  readonly description: string
}

/** `upcoming` until the ride starts, `live` while its group is open to join, `ended` after that. */
export type ClanEventState = 'upcoming' | 'live' | 'ended'

/** A ride the clan admin scheduled; times are ISO 8601 strings. */
export interface ClanEvent {
  readonly id: number
  readonly clan: number
  readonly clan_name: string
  readonly title: string
  readonly description: string
  readonly scheduled_at: string
  /** The route the group rides, or null in free mode. */
  readonly route: SavedRoute | null
  readonly state: ClanEventState
  /** The group opened when the event started, led by the admin; null before. */
  readonly route_group: string | null
  /** Whether the caller already rides in the group. */
  readonly is_joined: boolean
  readonly created_at: string
}

export interface NewClanEvent {
  readonly title: string
  readonly description: string
  /** Id of one of the caller's routes to ride, or null for free mode. */
  readonly route_id: string | null
  /** ISO 8601 start time, in the future. */
  readonly scheduled_at: string
}

/** A clan announcement; `created_at` is an ISO 8601 string. */
export interface ClanNotice {
  readonly id: number
  readonly clan: number
  readonly clan_name: string
  readonly author: ClanMember
  readonly title: string
  readonly description: string
  /** One of the author's routes, shown as a link; null when none is attached. */
  readonly route: SavedRoute | null
  /** The scheduled ride this notice announces, or null. */
  readonly event: ClanEvent | null
  readonly created_at: string
}

export interface NewClanNotice {
  readonly title: string
  readonly description: string
  /** Id of one of the caller's routes to attach, or null for none. */
  readonly route_id: string | null
}

/** A pending invitation to join a clan, as its invitee sees it. */
export interface ClanInvitation {
  readonly id: number
  readonly clan: number
  readonly clan_name: string
  readonly invited_by: ClanMember
  readonly created_at: string
}
