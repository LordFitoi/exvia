import type { PresenceStatus } from '@/services/groupMessages'
import type { GroupParticipant } from '@/types/routeGroup'

const PRESENCE_VERBS: Readonly<Record<PresenceStatus, string>> = {
  joined: 'joined the ride',
  left: 'left the ride',
}

/** The toast text for a rider who joined or left, or null when they are not a rider of the group. */
export const describePresence = (
  participants: readonly GroupParticipant[],
  userId: number,
  status: PresenceStatus,
): string | null => {
  const rider = participants.find(({ id }) => id === userId)
  return rider ? `${rider.username} ${PRESENCE_VERBS[status]}` : null
}
