import type { TokenPair, User } from '@/types/auth'
import type { SavedRoute } from '@/types/route'

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

export const isUser = (value: unknown): value is User =>
  isRecord(value) &&
  typeof value.id === 'number' &&
  typeof value.username === 'string' &&
  typeof value.email === 'string'

export const isTokenPair = (value: unknown): value is TokenPair =>
  isRecord(value) && typeof value.access === 'string' && typeof value.refresh === 'string'

export const isSavedRoute = (value: unknown): value is SavedRoute =>
  isRecord(value) &&
  typeof value.id === 'number' &&
  typeof value.name === 'string' &&
  typeof value.distance === 'number' &&
  typeof value.estimated_time === 'number'
