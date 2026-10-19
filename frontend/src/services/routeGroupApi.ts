import { ApiError } from '@/services/apiClient'
import { requestJsonAuthorized } from '@/services/authorizedRequest'
import { isRiderProfile, parseRouteGroup } from '@/services/routeGroupGuards'
import type { NewRouteGroup, RiderProfile, RouteGroup } from '@/types/routeGroup'

const GROUPS_PATH = '/api/routes/groups/'
const LOOKUP_PATH = '/api/auth/users/lookup/'
const UNEXPECTED_RESPONSE_MESSAGE = 'The server sent an unexpected response. Please try again.'

const unexpectedResponse = (): ApiError => new ApiError(502, UNEXPECTED_RESPONSE_MESSAGE)

const expectGroup = (payload: unknown): RouteGroup => {
  const group = parseRouteGroup(payload)
  if (!group) throw unexpectedResponse()
  return group
}

/** Creates a group led by the caller; the server invites `invitees` and notifies them at once. */
export const createRouteGroup = async ({ routeId, invitees }: NewRouteGroup): Promise<RouteGroup> =>
  expectGroup(
    await requestJsonAuthorized(GROUPS_PATH, { method: 'POST', body: { route: routeId, invitees } }),
  )

/** A group the caller is in or was invited to, with the path of its route. */
export const fetchRouteGroup = async (id: string): Promise<RouteGroup> =>
  expectGroup(await requestJsonAuthorized(`${GROUPS_PATH}${id}/`))

/** The newest group the caller can join back (another rider still connected), or null when none is. */
export const fetchActiveGroup = async (): Promise<RouteGroup | null> => {
  const payload = await requestJsonAuthorized(`${GROUPS_PATH}active/`)
  return payload === null ? null : expectGroup(payload)
}

/** Accepts the caller's invitation and returns the group, ready to ride. */
export const acceptRouteInvitation = async (groupId: string): Promise<RouteGroup> =>
  expectGroup(await requestJsonAuthorized(`${GROUPS_PATH}${groupId}/accept/`, { method: 'POST' }))

/** Turns the caller's invitation down; they leave the group. */
export const rejectRouteInvitation = async (groupId: string): Promise<void> => {
  await requestJsonAuthorized(`${GROUPS_PATH}${groupId}/reject/`, { method: 'POST' })
}

/** Takes the caller, who accepted the group, out of it; it is then no longer offered to them. */
export const leaveRouteGroup = async (groupId: string): Promise<void> => {
  await requestJsonAuthorized(`${GROUPS_PATH}${groupId}/leave/`, { method: 'POST' })
}

/** The rider with exactly this username; an unknown name is an `ApiError` with status 404. */
export const lookupRider = async (username: string): Promise<RiderProfile> => {
  const rider = await requestJsonAuthorized(`${LOOKUP_PATH}?username=${encodeURIComponent(username)}`)
  if (!isRiderProfile(rider)) throw unexpectedResponse()
  return rider
}
