import { isRecord, isSavedRoute } from '@/services/typeGuards'
import type { Clan, ClanDetail, ClanEvent, ClanEventState, ClanInvitation, ClanMember, ClanNotice } from '@/types/clan'

export const isClanMember = (value: unknown): value is ClanMember =>
  isRecord(value) && typeof value.id === 'number' && typeof value.username === 'string'

export const isClan = (value: unknown): value is Clan =>
  isRecord(value) &&
  typeof value.id === 'number' &&
  typeof value.name === 'string' &&
  typeof value.description === 'string' &&
  typeof value.owner === 'number' &&
  typeof value.created_at === 'string'

export const isClanDetail = (value: unknown): value is ClanDetail =>
  isClan(value) && 'members' in value && Array.isArray(value.members) && value.members.every(isClanMember)

const EVENT_STATES: readonly unknown[] = ['upcoming', 'live', 'ended'] satisfies ClanEventState[]

export const isClanEvent = (value: unknown): value is ClanEvent =>
  isRecord(value) &&
  typeof value.id === 'number' &&
  typeof value.clan === 'number' &&
  typeof value.clan_name === 'string' &&
  typeof value.title === 'string' &&
  typeof value.description === 'string' &&
  typeof value.scheduled_at === 'string' &&
  (value.route === null || isSavedRoute(value.route)) &&
  EVENT_STATES.includes(value.state) &&
  (value.route_group === null || typeof value.route_group === 'string') &&
  typeof value.is_joined === 'boolean' &&
  typeof value.created_at === 'string'

export const isClanNotice = (value: unknown): value is ClanNotice =>
  isRecord(value) &&
  typeof value.id === 'number' &&
  typeof value.clan === 'number' &&
  typeof value.clan_name === 'string' &&
  isClanMember(value.author) &&
  typeof value.title === 'string' &&
  typeof value.description === 'string' &&
  (value.route === null || isSavedRoute(value.route)) &&
  (value.event === null || isClanEvent(value.event)) &&
  typeof value.created_at === 'string'

export const isClanInvitation = (value: unknown): value is ClanInvitation =>
  isRecord(value) &&
  typeof value.id === 'number' &&
  typeof value.clan === 'number' &&
  typeof value.clan_name === 'string' &&
  isClanMember(value.invited_by) &&
  typeof value.created_at === 'string'
