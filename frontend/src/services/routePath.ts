import type { Coordinates } from '@/types/geolocation'
import type { DraftPoint } from '@/types/route'

/** The whole street path of a draft: every point's leg joined in order, with no repeats. */
export const flattenRoutePath = (points: readonly DraftPoint[]): Coordinates[] =>
  points.flatMap(({ path }) => path)
