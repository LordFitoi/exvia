import { isUnauthorizedError } from '@/services/apiClient'
import { fetchCurrentUser, refreshTokens, requestTokens } from '@/services/authApi'
import { clearTokens, loadTokens, saveTokens } from '@/services/tokenStorage'
import type { LoginCredentials, User } from '@/types/auth'

/** Exchanges credentials for tokens, stores them and returns the signed-in user. */
export const startSession = async (credentials: LoginCredentials): Promise<User> => {
  const tokens = await requestTokens(credentials)
  const user = await fetchCurrentUser(tokens.access)
  saveTokens(tokens)
  return user
}

/**
 * Rebuilds the session from stored tokens, refreshing an expired access token once.
 * Returns null when there is no valid session; network errors propagate so a
 * connection drop does not log the user out.
 */
export const restoreSession = async (): Promise<User | null> => {
  const tokens = loadTokens()
  if (!tokens) return null

  try {
    return await fetchCurrentUser(tokens.access)
  } catch (error) {
    if (!isUnauthorizedError(error)) throw error
  }

  try {
    const renewed = await refreshTokens(tokens.refresh)
    const user = await fetchCurrentUser(renewed.access)
    saveTokens(renewed)
    return user
  } catch (error) {
    if (!isUnauthorizedError(error)) throw error
    clearTokens()
    return null
  }
}

export const endSession = (): void => clearTokens()
