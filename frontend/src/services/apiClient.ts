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
  readonly method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  /** Sent as JSON, or as multipart when it is a `FormData` (file uploads). */
  readonly body?: unknown
  readonly accessToken?: string
  /** Cancels the request, for answers that stop mattering (the map moved on). */
  readonly signal?: AbortSignal
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

const encodeBody = (body: unknown): BodyInit | undefined => {
  if (body instanceof FormData) return body
  return body ? JSON.stringify(body) : undefined
}

export const requestJson = async (
  path: string,
  { method = 'GET', body, accessToken, signal }: RequestOptions = {},
): Promise<unknown> => {
  const isMultipart = body instanceof FormData
  // A multipart body gets its Content-Type (with the boundary) from the browser.
  const headers: Record<string, string> = isMultipart ? {} : { 'Content-Type': 'application/json' }
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`

  let response: Response
  try {
    response = await fetch(path, {
      method,
      headers,
      body: encodeBody(body),
      signal: AbortSignal.any([AbortSignal.timeout(REQUEST_TIMEOUT_MS), ...(signal ? [signal] : [])]),
    })
  } catch (error) {
    if (signal?.aborted) throw error
    console.error(`Request ${method} ${path} failed`, error)
    const isTimeout = error instanceof DOMException && error.name === 'TimeoutError'
    throw new ApiError(0, isTimeout ? TIMEOUT_ERROR_MESSAGE : NETWORK_ERROR_MESSAGE)
  }

  const payload = await readJson(response)
  if (!response.ok) throw toApiError(response.status, payload)
  return payload
}
