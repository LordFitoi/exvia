import { fetchStreetPath } from '@/services/streetRouteApi'
import type { DraftPoint, Waypoint } from '@/types/route'

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
  waypoints: readonly Waypoint[],
  options: DraftPointsOptions,
): Promise<DraftPoint[] | null> => {
  const legs = await Promise.all(
    waypoints.map(async ({ coordinates }, index) => {
      if (index === 0) return [coordinates]
      const path = await fetchStreetPath(waypoints[index - 1].coordinates, coordinates, options)
      return path && path.slice(1)
    }),
  )
  const paths = legs.filter((leg) => leg !== null)
  if (paths.length !== legs.length) return null
  return waypoints.map((waypoint, index) => ({ ...waypoint, id: index, path: paths[index] }))
}
