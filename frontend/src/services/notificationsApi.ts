import { ApiError } from '@/services/apiClient'
import { requestJsonAuthorized } from '@/services/authorizedRequest'
import { isParticipantStatus, isRiderProfile } from '@/services/routeGroupGuards'
import { isRecord } from '@/services/typeGuards'
import type { InvitationStatus, RideNotification, RouteInvitation, StartedRide, StartedRideStatus } from '@/types/notification'

const NOTIFICATIONS_PATH = '/api/notifications/'
const ROUTE_INVITATION_TYPE = 'route_invitation'
const EVENT_STARTED_TYPE = 'event_started'
const STARTED_RIDE_STATUSES: readonly unknown[] = ['open', 'joined', 'ended'] satisfies StartedRideStatus[]
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

const isStartedRide = (value: unknown): value is StartedRide =>
  isRecord(value) &&
  value.event_type === EVENT_STARTED_TYPE &&
  typeof value.id === 'number' &&
  isRiderProfile(value.author) &&
  typeof value.route_group === 'string' &&
  typeof value.scheduled_event === 'number' &&
  typeof value.event_title === 'string' &&
  typeof value.clan_name === 'string' &&
  STARTED_RIDE_STATUSES.includes(value.status) &&
  typeof value.created_at === 'string'

const isRideNotification = (value: unknown): value is RideNotification =>
  isRouteInvitation(value) || isStartedRide(value)

/** The invitations to ride and the clan rides that started, addressed to the caller, newest first; other kinds of notification are skipped. */
export const fetchRideNotifications = async (): Promise<RideNotification[]> => {
  const notifications = await requestJsonAuthorized(NOTIFICATIONS_PATH)
  if (!Array.isArray(notifications)) throw new ApiError(502, UNEXPECTED_RESPONSE_MESSAGE)
  return notifications.filter(isRideNotification)
}
