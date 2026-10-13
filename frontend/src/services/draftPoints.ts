import { fetchStreetPath } from '@/services/streetRouteApi'
import type { Coordinates } from '@/types/geolocation'
import type { DraftPoint } from '@/types/route'

interface DraftPointsOptions {
  readonly accessToken: string
  readonly signal: AbortSignal
}

/**
 * Rebuilds the draft of a saved route from its waypoints by routing every leg between them in
 * parallel. Returns null when any leg has no street route. The path of each point is the leg that
 * leads to it, without the previous point itself, as `useRouteDraft` builds it.
 */
export const buildDraftPoints = async (
  waypoints: readonly Coordinates[],
  options: DraftPointsOptions,
): Promise<DraftPoint[] | null> => {
  const legs = await Promise.all(
    waypoints.map(async (waypoint, index) => {
      if (index === 0) return [waypoint]
      const path = await fetchStreetPath(waypoints[index - 1], waypoint, options)
      return path && path.slice(1)
    }),
  )
  const paths = legs.filter((leg) => leg !== null)
  if (paths.length !== legs.length) return null
  return waypoints.map((coordinates, index) => ({ id: index, coordinates, path: paths[index] }))
}
