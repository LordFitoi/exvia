import type { PresenceStatus } from '@/services/groupMessages'
import type { GroupParticipant } from '@/types/routeGroup'

/**
 * How long a rider who dropped is still counted as in the ride: a locked screen or another app drops the
 * socket for a moment, and their marker stays on the map meanwhile (see `STALE_AFTER_MS`).
 */
export const PRESENCE_GRACE_MS = 20_000

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
