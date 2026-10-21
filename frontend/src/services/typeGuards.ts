import type { TokenPair, User } from '@/types/auth'
import type { Rider, RideSummaryDetail, RideSummaryListItem } from '@/types/rideSummary'
import type { RouteSummary, SavedRoute } from '@/types/route'

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

export const isUser = (value: unknown): value is User =>
  isRecord(value) &&
  typeof value.id === 'number' &&
  typeof value.username === 'string' &&
  typeof value.email === 'string' &&
  typeof value.is_staff === 'boolean'

export const isTokenPair = (value: unknown): value is TokenPair =>
  isRecord(value) && typeof value.access === 'string' && typeof value.refresh === 'string'

export const isSavedRoute = (value: unknown): value is SavedRoute =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  typeof value.name === 'string' &&
  typeof value.distance === 'number' &&
  typeof value.estimated_time === 'number'

export const isRouteSummary = (value: unknown): value is RouteSummary =>
  isSavedRoute(value) && 'description' in value && typeof value.description === 'string'

const isNumberOrNull = (value: unknown): value is number | null =>
  value === null || typeof value === 'number'

const isRider = (value: unknown): value is Rider =>
  isRecord(value) && typeof value.id === 'number' && typeof value.username === 'string'

export const isRideSummaryListItem = (value: unknown): value is RideSummaryListItem =>
  isRecord(value) &&
  typeof value.id === 'number' &&
  typeof value.route === 'string' &&
  typeof value.route_name === 'string' &&
  typeof value.distance === 'number' &&
  typeof value.start_at === 'string' &&
  typeof value.end_at === 'string' &&
  typeof value.duration === 'number' &&
  typeof value.is_finished === 'boolean' &&
  typeof value.created_at === 'string'

export const isRideSummaryDetail = (value: unknown): value is RideSummaryDetail =>
  isRideSummaryListItem(value) &&
  'participants' in value &&
  Array.isArray(value.participants) &&
  value.participants.every(isRider) &&
  'estimated_time' in value &&
  typeof value.estimated_time === 'number' &&
  'author' in value &&
  typeof value.author === 'number' &&
  'max_speed' in value &&
  isNumberOrNull(value.max_speed)
