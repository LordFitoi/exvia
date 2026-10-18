import { measureDistance } from '@/services/routeProgress'
import type { Coordinates } from '@/types/geolocation'

// A fix this close to the last point kept is the same place seen through GPS noise.
const MIN_STEP_METERS = 5
// A fix whose error radius is wider than this is a guess, and would draw a spike in the track.
const MAX_ACCURACY_METERS = 30

/**
 * The track with one more GPS fix on its end. The fix is left out when its accuracy is too poor
 * (null means the device did not say) or when it is within `MIN_STEP_METERS` of the last point
 * kept, so standing still adds nothing and no point repeats.
 */
export const addTrackFix = (
  track: readonly Coordinates[],
  fix: Coordinates,
  accuracy: number | null,
): readonly Coordinates[] => {
  if (accuracy !== null && accuracy > MAX_ACCURACY_METERS) return track
  const last = track[track.length - 1]
  if (last && measureDistance(last, fix) < MIN_STEP_METERS) return track
  return [...track, fix]
}
