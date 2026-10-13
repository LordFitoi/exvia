import { ApiError, HTTP_UNAUTHORIZED, isUnauthorizedError, requestJson } from '@/services/apiClient'
import type { RequestOptions } from '@/services/apiClient'
import { refreshTokens } from '@/services/authApi'
import { clearTokens, loadTokens, saveTokens } from '@/services/tokenStorage'

const SESSION_EXPIRED_MESSAGE = 'Your session has expired. Log in again to continue.'

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
