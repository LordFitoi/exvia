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
  readonly created_at: string
}

export interface NewClanNotice {
  readonly title: string
  readonly description: string
}

/** A pending invitation to join a clan, as its invitee sees it. */
export interface ClanInvitation {
  readonly id: number
  readonly clan: number
  readonly clan_name: string
  readonly invited_by: ClanMember
  readonly created_at: string
}
