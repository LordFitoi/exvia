import { isTokenPair } from '@/services/typeGuards'
import type { TokenPair } from '@/types/auth'

const STORAGE_KEY = 'exvia.auth.tokens'

export const loadTokens = (): TokenPair | null => {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (!stored) return null
    const parsed: unknown = JSON.parse(stored)
    return isTokenPair(parsed) ? parsed : null
  } catch {
    return null
  }
}

export const saveTokens = (tokens: TokenPair): void => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens))
  } catch (error) {
    console.error('Could not persist the session; you will be logged out on reload', error)
  }
}

export const clearTokens = (): void => {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error('Could not clear the stored session', error)
  }
}
