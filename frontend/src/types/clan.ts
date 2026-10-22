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
