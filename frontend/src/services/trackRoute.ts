import { formatRideDate } from '@/services/formatRoute'
import { measureDeviations } from '@/services/pathDeviation'
import { measureDistance } from '@/services/routeProgress'
import { simplifyPath } from '@/services/simplifyPath'
import { fetchStreetPath } from '@/services/streetRouteApi'
import { toPlainWaypoint } from '@/services/waypoints'
import type { Coordinates } from '@/types/geolocation'
import type { TrackPoint, TrackRoute } from '@/types/track'

/** The farthest a point of the track may be from the street path that stands for it. */
export const TRACK_TOLERANCE_METERS = 30
/** A track shorter than this is not worth a route. */
export const MIN_TRACK_METERS = 100
const ROUTE_NAME_PREFIX = 'Track'
/** The server's limits of a route (`MAX_POINTS`, `MAX_WAYPOINTS`). */
const MAX_ROUTE_POINTS = 20_000
const MAX_WAYPOINTS = 500
// Streets are asked for a few legs at a time, to stay inside the routing service's rate limit.
const MAX_PARALLEL_LEGS = 6
const FIRST_THINNING_DEGREES = 0.00001
const THINNING_GROWTH = 2

/** The street paths already asked for, by the track indexes of the leg's ends: kept so that a retry asks for nothing again. */
export type LegCache = Map<string, readonly Coordinates[] | null>

interface BuildOptions {
  readonly accessToken: string
  readonly signal: AbortSignal
  readonly cache: LegCache
}

/** A stretch of the track, by the indexes of its first and last point. */
interface Leg {
  readonly first: number
  readonly last: number
}

interface RoutedLeg extends Leg {
  readonly path: readonly Coordinates[]
}

/** What routing a leg found: the leg is done, or it has to be cut at `splitAt`. */
interface LegOutcome {
  readonly leg: Leg
  readonly path: readonly Coordinates[] | null
  readonly splitAt: number | null
}

const fetchLegPath = async (track: readonly TrackPoint[], leg: Leg, options: BuildOptions) => {
  const key = `${leg.first}-${leg.last}`
  if (options.cache.has(key)) return options.cache.get(key) ?? null
  const { accessToken, signal } = options
  const path = await fetchStreetPath(track[leg.first].coordinates, track[leg.last].coordinates, { accessToken, signal })
  options.cache.set(key, path)
  return path
}

/** The point farthest from the path it was measured against: its place in the list and its distance. */
const findStrayPoint = (deviations: readonly number[]) =>
  deviations.reduce((stray, meters, offset) => (meters > stray.meters ? { offset, meters } : stray), { offset: 0, meters: 0 })

const findNearestOffset = (points: readonly Coordinates[], target: Coordinates): number =>
  points.reduce((nearest, point, offset) => (measureDistance(point, target) < measureDistance(points[nearest], target) ? offset : nearest), 0)

/**
 * Whether the street path stands for the leg, looking both ways: the track must stay near the path, and the
 * path near the track (a detour of the streets between two points is not where the rider went). When it does
 * not, where to cut the leg: where the track strays from the path, or else next to where the path strays.
 */
const judgeLegPath = (track: readonly TrackPoint[], { first, last }: Leg, path: readonly Coordinates[]): number | null => {
  const ridden = track.slice(first, last + 1).map(({ coordinates }) => coordinates)
  const trackStray = findStrayPoint(measureDeviations(ridden.slice(1, -1), path))
  if (trackStray.meters > TRACK_TOLERANCE_METERS) return first + 1 + trackStray.offset
  const pathStray = findStrayPoint(measureDeviations(path, ridden))
  if (pathStray.meters <= TRACK_TOLERANCE_METERS) return null
  const nearest = first + findNearestOffset(ridden, path[pathStray.offset])
  return nearest > first && nearest < last ? nearest : Math.floor((first + last) / 2)
}

const routeLeg = async (track: readonly TrackPoint[], leg: Leg, options: BuildOptions): Promise<LegOutcome> => {
  const path = await fetchLegPath(track, leg, options)
  const isSingleStep = leg.last - leg.first <= 1
  // No street joins the ends: the track went where the streets do not, so look at each half on its own.
  if (!path) return { leg, path, splitAt: isSingleStep ? null : Math.floor((leg.first + leg.last) / 2) }
  const splitAt = judgeLegPath(track, leg, path)
  // Two neighbouring points the streets only join the long way round are joined by a straight line instead.
  if (splitAt !== null && isSingleStep) return { leg, path: null, splitAt: null }
  return { leg, path, splitAt }
}

const routeInChunks = async (track: readonly TrackPoint[], legs: readonly Leg[], options: BuildOptions) => {
  const outcomes: LegOutcome[] = []
  for (let start = 0; start < legs.length; start += MAX_PARALLEL_LEGS) {
    const chunk = legs.slice(start, start + MAX_PARALLEL_LEGS)
    outcomes.push(...(await Promise.all(chunk.map((leg) => routeLeg(track, leg, options)))))
  }
  return outcomes
}

// Legs the street cannot be found for are joined by a straight line, so the route still goes where the rider went.
const settleLeg = (track: readonly TrackPoint[], { leg, path }: LegOutcome): RoutedLeg => ({
  ...leg,
  path: path ?? [track[leg.first].coordinates, track[leg.last].coordinates],
})

/**
 * Routes the whole track as one leg between its ends and cuts a leg where the track strays farthest from the
 * street path found for it, until every point of the track is within `TRACK_TOLERANCE_METERS` of its leg. The
 * cuts are the waypoints, so the route is rebuilt from as few of them as the streets allow.
 */
const splitIntoLegs = async (track: readonly TrackPoint[], options: BuildOptions): Promise<RoutedLeg[]> => {
  const settled: RoutedLeg[] = []
  let pending: Leg[] = [{ first: 0, last: track.length - 1 }]
  let legCount = 1
  while (pending.length > 0) {
    const next: Leg[] = []
    for (const outcome of await routeInChunks(track, pending, options)) {
      const { leg, splitAt } = outcome
      // Every cut adds a leg, and a route has at most `MAX_WAYPOINTS` waypoints, one more than its legs.
      const hasRoom = legCount < MAX_WAYPOINTS - 1
      if (splitAt === null || !hasRoom) {
        settled.push(settleLeg(track, outcome))
        continue
      }
      next.push({ first: leg.first, last: splitAt }, { first: splitAt, last: leg.last })
      legCount += 1
    }
    pending = next
  }
  return settled.sort((a, b) => a.first - b.first)
}

// The server takes at most `MAX_ROUTE_POINTS`; thin the path a little more each time until it fits.
const fitPoints = (points: readonly Coordinates[]): readonly Coordinates[] => {
  let tolerance = FIRST_THINNING_DEGREES
  let fitted = points
  while (fitted.length > MAX_ROUTE_POINTS) {
    fitted = simplifyPath(points, tolerance)
    tolerance *= THINNING_GROWTH
  }
  return fitted
}

/** The name of the route a track becomes: "Track" and the day it ended, such as "Track 22 Nov 2026". */
export const getTrackRouteName = (endedAt: number): string =>
  `${ROUTE_NAME_PREFIX} ${formatRideDate(new Date(endedAt).toISOString())}`

/**
 * Turns a recorded track into a route: the street path along the track, and the fewest waypoints that lead
 * the streets the same way. `track` needs two points at least.
 */
export const buildTrackRoute = async (track: readonly TrackPoint[], options: BuildOptions): Promise<TrackRoute> => {
  const legs = await splitIntoLegs(track, options)
  // Each leg starts where the one before it ended, so its first point is not repeated.
  const points = fitPoints(legs.flatMap(({ path }, index) => (index === 0 ? path : path.slice(1))))
  const chosen = [...legs.map(({ first }) => first), legs[legs.length - 1].last]
  return {
    points,
    waypoints: chosen.map((index) => toPlainWaypoint(track[index].coordinates)),
    reachedAt: chosen.map((index) => track[index].at),
  }
}
