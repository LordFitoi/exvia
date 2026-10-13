import { isRecord } from '@/services/typeGuards'
import type { FieldErrors } from '@/types/auth'

export const HTTP_UNAUTHORIZED = 401
const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.'
const REQUEST_TIMEOUT_MS = 15000
const TIMEOUT_ERROR_MESSAGE = 'The server is taking too long to respond. Please try again.'
const NETWORK_ERROR_MESSAGE = 'Could not reach the server. Check your connection and try again.'

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly fieldErrors: FieldErrors = {},
  ) {
    super(message)
  }
}

export interface RequestOptions {
  readonly method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  readonly body?: unknown
  readonly accessToken?: string
}

export const isUnauthorizedError = (error: unknown): boolean =>
  error instanceof ApiError && error.status === HTTP_UNAUTHORIZED

const firstMessage = (value: unknown): string | null => {
  if (typeof value === 'string') return value
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
  return null
}

const parseFieldErrors = (payload: unknown): FieldErrors => {
  if (!isRecord(payload)) return {}
  const entries = Object.entries(payload).flatMap(([field, value]) => {
    const message = firstMessage(value)
    return message ? [[field, message] as const] : []
  })
  return Object.fromEntries(entries)
}

const readJson = async (response: Response): Promise<unknown> => {
  try {
    return await response.json()
  } catch {
    return null
  }
}

const toApiError = (status: number, payload: unknown): ApiError => {
  const fieldErrors = parseFieldErrors(payload)
  const message = fieldErrors.detail ?? fieldErrors.non_field_errors ?? GENERIC_ERROR_MESSAGE
  return new ApiError(status, message, fieldErrors)
}

export const requestJson = async (
  path: string,
  { method = 'GET', body, accessToken }: RequestOptions = {},
): Promise<unknown> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`

  let response: Response
  try {
    response = await fetch(path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch (error) {
    console.error(`Request ${method} ${path} failed`, error)
    const isTimeout = error instanceof DOMException && error.name === 'TimeoutError'
    throw new ApiError(0, isTimeout ? TIMEOUT_ERROR_MESSAGE : NETWORK_ERROR_MESSAGE)
  }

  const payload = await readJson(response)
  if (!response.ok) throw toApiError(response.status, payload)
  return payload
}
