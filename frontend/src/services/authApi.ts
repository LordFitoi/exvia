import { ApiError, requestJson } from '@/services/apiClient'
import { isTokenPair, isUser } from '@/services/typeGuards'
import type { LoginCredentials, SignupInput, TokenPair, User } from '@/types/auth'

const TOKEN_PATH = '/api/auth/token/'
const REFRESH_PATH = '/api/auth/token/refresh/'
const SIGNUP_PATH = '/api/auth/signup/'
const CURRENT_USER_PATH = '/api/auth/me/'
const UNEXPECTED_RESPONSE_MESSAGE = 'The server sent an unexpected response. Please try again.'

const expectUser = (payload: unknown): User => {
  if (!isUser(payload)) throw new ApiError(502, UNEXPECTED_RESPONSE_MESSAGE)
  return payload
}

const expectTokenPair = (payload: unknown): TokenPair => {
  if (!isTokenPair(payload)) throw new ApiError(502, UNEXPECTED_RESPONSE_MESSAGE)
  return payload
}

export const requestTokens = async (credentials: LoginCredentials): Promise<TokenPair> =>
  expectTokenPair(await requestJson(TOKEN_PATH, { method: 'POST', body: credentials }))

export const refreshTokens = async (refresh: string): Promise<TokenPair> =>
  expectTokenPair(await requestJson(REFRESH_PATH, { method: 'POST', body: { refresh } }))

export const createAccount = async (input: SignupInput): Promise<void> => {
  await requestJson(SIGNUP_PATH, { method: 'POST', body: input })
}

export const fetchCurrentUser = async (accessToken: string): Promise<User> =>
  expectUser(await requestJson(CURRENT_USER_PATH, { accessToken }))
