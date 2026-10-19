import { ApiError, HTTP_UNAUTHORIZED, isUnauthorizedError, requestJson } from '@/services/apiClient'
import type { RequestOptions } from '@/services/apiClient'
import { refreshTokens } from '@/services/authApi'
import { getTokenExpiry } from '@/services/jwt'
import { clearTokens, loadTokens, saveTokens } from '@/services/tokenStorage'

const SESSION_EXPIRED_MESSAGE = 'Your session has expired. Log in again to continue.'
// An access token this close to its end is renewed before it is used somewhere that cannot retry.
const EXPIRY_MARGIN_MS = 60_000

const renewAccessToken = async (refresh: string): Promise<string> => {
  try {
    const renewed = await refreshTokens(refresh)
    saveTokens(renewed)
    return renewed.access
  } catch (error) {
    if (!isUnauthorizedError(error)) throw error
    clearTokens()
    throw new ApiError(HTTP_UNAUTHORIZED, SESSION_EXPIRED_MESSAGE)
  }
}

/** Calls the API as the signed-in user, refreshing an expired access token once. */
export const requestJsonAuthorized = async (
  path: string,
  options: Omit<RequestOptions, 'accessToken'> = {},
): Promise<unknown> => {
  const tokens = loadTokens()
  if (!tokens) throw new ApiError(HTTP_UNAUTHORIZED, SESSION_EXPIRED_MESSAGE)

  try {
    return await requestJson(path, { ...options, accessToken: tokens.access })
  } catch (error) {
    if (!isUnauthorizedError(error)) throw error
  }
  const accessToken = await renewAccessToken(tokens.refresh)
  return requestJson(path, { ...options, accessToken })
}

/**
 * An access token that is good for at least a minute, renewed first when it is not (or when `isRenewalForced`).
 * For places that cannot retry on a 401 the way `requestJsonAuthorized` does, such as a websocket handshake.
 */
export const getAccessToken = async (isRenewalForced = false): Promise<string> => {
  const tokens = loadTokens()
  if (!tokens) throw new ApiError(HTTP_UNAUTHORIZED, SESSION_EXPIRED_MESSAGE)
  const expiry = getTokenExpiry(tokens.access)
  const isExpiring = expiry !== null && expiry - Date.now() < EXPIRY_MARGIN_MS
  return isRenewalForced || isExpiring ? renewAccessToken(tokens.refresh) : tokens.access
}
