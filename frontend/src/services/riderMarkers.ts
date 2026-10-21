import type { LivePosition } from '@/services/groupMessages'
import type { Coordinates } from '@/types/geolocation'
import type { GroupParticipant } from '@/types/routeGroup'

/**
 * A rider that has not reported for this long is left off the map: they probably closed the app. It must
 * outlast `PRESENCE_GRACE_MS` plus one report, so a rider who drops stays visible while the grace runs.
 */
export const STALE_AFTER_MS = 30_000

/** What the map needs to draw another rider: who they are and where they are. */
export interface RiderMarkerData {
  readonly id: number
  readonly username: string
  readonly avatar: string | null
  /** Where the rider was at their last report, which is not where they are drawn: the marker moves on from it. */
  readonly position: Coordinates
  /** How fast the rider was going at that report, in km/h; null when their device gave none. */
  readonly speed: number | null
  /** When this phone heard that report (ms since the epoch); it tells one report from the next. */
  readonly reportedAt: number
}

/** The riders of the group whose position is recent, ready to be drawn. */
export const buildRiderMarkers = (
  participants: readonly GroupParticipant[],
  positions: ReadonlyMap<number, LivePosition>,
  now: number,
): RiderMarkerData[] =>
  participants.flatMap(({ id, username, avatar }) => {
    const live = positions.get(id)
    if (!live || now - live.seenAt > STALE_AFTER_MS) return []
    return [{ id, username, avatar, position: live.position.coordinates, speed: live.position.speed, reportedAt: live.seenAt }]
  })
