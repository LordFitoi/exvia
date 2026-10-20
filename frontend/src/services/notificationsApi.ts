import { ApiError } from '@/services/apiClient'
import { requestJsonAuthorized } from '@/services/authorizedRequest'
import { isParticipantStatus, isRiderProfile } from '@/services/routeGroupGuards'
import { isRecord } from '@/services/typeGuards'
import type { InvitationStatus, RouteInvitation } from '@/types/notification'

const NOTIFICATIONS_PATH = '/api/notifications/'
const ROUTE_INVITATION_TYPE = 'route_invitation'
const EXPIRED_STATUS = 'expired'
const UNEXPECTED_RESPONSE_MESSAGE = 'The server sent an unexpected response. Please try again.'

const isInvitationStatus = (value: unknown): value is InvitationStatus =>
  value === EXPIRED_STATUS || isParticipantStatus(value)

const isRouteInvitation = (value: unknown): value is RouteInvitation =>
  isRecord(value) &&
  value.event_type === ROUTE_INVITATION_TYPE &&
  typeof value.id === 'number' &&
  isRiderProfile(value.author) &&
  typeof value.route_group === 'string' &&
  (value.route_name === null || typeof value.route_name === 'string') &&
  isInvitationStatus(value.status) &&
  typeof value.created_at === 'string'

/** The invitations to ride addressed to the caller, newest first; other kinds of notification are skipped. */
export const fetchRouteInvitations = async (): Promise<RouteInvitation[]> => {
  const notifications = await requestJsonAuthorized(NOTIFICATIONS_PATH)
  if (!Array.isArray(notifications)) throw new ApiError(502, UNEXPECTED_RESPONSE_MESSAGE)
  return notifications.filter(isRouteInvitation)
}
